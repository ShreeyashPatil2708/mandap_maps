# ---------------------------------------------------------------------------
# ALB: reachable only from CloudFront. The edge path is
# Cloudflare -> CloudFront -> ALB, so CloudFront is the ALB's only client and
# ingress is scoped to CloudFront's origin-facing ranges (an AWS-managed prefix
# list). The x-origin-secret header check on the /api rule is the second layer.
# (Referencing a prefix list costs one SG rule per entry; keeping just the
# CloudFront list also keeps us under the per-SG rule limit.)
# ---------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name = "${var.name}-alb-sg"
  # NOTE: description is immutable (changing it force-replaces the SG and churns
  # the live ALB), so it is left as-is. Ingress is actually scoped to CloudFront
  # now (see the comment above), not Cloudflare.
  description = "ALB ingress restricted to Cloudflare ranges"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-alb-sg" })
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "alb_https_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from CloudFront origin-facing ranges"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_egress_rule" "alb_to_app" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to app fleet (API)"
  ip_protocol                  = "tcp"
  from_port                    = var.api_port
  to_port                      = var.api_port
  referenced_security_group_id = aws_security_group.app.id
}

resource "aws_vpc_security_group_egress_rule" "alb_to_chatbot" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to app fleet (chatbot)"
  ip_protocol                  = "tcp"
  from_port                    = var.chatbot_port
  to_port                      = var.chatbot_port
  referenced_security_group_id = aws_security_group.app.id
}

# ---------------------------------------------------------------------------
# App fleet: API and chatbot instances. Ingress only from the ALB.
# ---------------------------------------------------------------------------
resource "aws_security_group" "app" {
  name        = "${var.name}-app-sg"
  description = "App fleet, ingress only from the ALB"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-app-sg" })
}

resource "aws_vpc_security_group_ingress_rule" "app_api_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "API port from ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.api_port
  to_port                      = var.api_port
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_ingress_rule" "app_chatbot_from_alb" {
  security_group_id            = aws_security_group.app.id
  description                  = "Chatbot port from ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.chatbot_port
  to_port                      = var.chatbot_port
  referenced_security_group_id = aws_security_group.alb.id
}

# Egress open so instances can reach RDS, Secrets Manager, Groq, package
# mirrors and git over the NAT instance. Locking egress further would break
# SSM and dependency installs for little gain at this scale.
resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  description       = "All egress (via NAT instance / S3 endpoint)"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ---------------------------------------------------------------------------
# RDS: 5432 only from the app fleet.
# ---------------------------------------------------------------------------
resource "aws_security_group" "rds" {
  name        = "${var.name}-rds-sg"
  description = "Postgres, ingress only from the app fleet"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-rds-sg" })
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_app" {
  security_group_id            = aws_security_group.rds.id
  description                  = "Postgres from app fleet"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}

# ---------------------------------------------------------------------------
# NAT instance: forwards outbound traffic from the private subnets.
# ---------------------------------------------------------------------------
resource "aws_security_group" "nat" {
  name        = "${var.name}-nat-sg"
  description = "NAT instance for private subnet egress"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-nat-sg" })
}

resource "aws_vpc_security_group_ingress_rule" "nat_from_vpc" {
  security_group_id = aws_security_group.nat.id
  description       = "Egress traffic from private subnets"
  ip_protocol       = "-1"
  cidr_ipv4         = var.vpc_cidr
}

resource "aws_vpc_security_group_egress_rule" "nat_all" {
  security_group_id = aws_security_group.nat.id
  description       = "NAT to internet"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
