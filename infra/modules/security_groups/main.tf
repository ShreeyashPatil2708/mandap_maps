# The default VPC security group allows all intra-SG traffic. Override it to
# deny everything so nothing accidentally uses it.
resource "aws_default_security_group" "default" {
  vpc_id = var.vpc_id
  tags   = { Name = "${var.name_prefix}-sg-default-deny" }
}

# --- Security group shells (rules added separately to avoid circular refs) ---

resource "aws_security_group" "nlb" {
  name        = "${var.name_prefix}-sg-nlb"
  description = "Internal NLB -- accepts traffic from API Gateway VPC Link"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.name_prefix}-sg-nlb" }
}

resource "aws_security_group" "node" {
  name        = "${var.name_prefix}-sg-node"
  description = "Node.js ASG instances (ports 3000 prod, 3001 dev)"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.name_prefix}-sg-node" }
}

resource "aws_security_group" "python" {
  name        = "${var.name_prefix}-sg-python"
  description = "Python FastAPI ASG instances -- RAG chatbot (port 8000)"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.name_prefix}-sg-python" }
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-sg-rds"
  description = "RDS PostgreSQL -- inbound from app tier only"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.name_prefix}-sg-rds" }
}

# --- NLB rules ---
# VPC Link ENIs are within the VPC CIDR, so scoping to vpc_cidr is correct.

resource "aws_vpc_security_group_ingress_rule" "nlb_node_prod" {
  security_group_id = aws_security_group.nlb.id
  description       = "Node.js prod from VPC Link"
  from_port         = 3000
  to_port           = 3000
  ip_protocol       = "tcp"
  cidr_ipv4         = var.vpc_cidr
}

resource "aws_vpc_security_group_ingress_rule" "nlb_node_dev" {
  security_group_id = aws_security_group.nlb.id
  description       = "Node.js dev from VPC Link"
  from_port         = 3001
  to_port           = 3001
  ip_protocol       = "tcp"
  cidr_ipv4         = var.vpc_cidr
}

resource "aws_vpc_security_group_ingress_rule" "nlb_python" {
  security_group_id = aws_security_group.nlb.id
  description       = "Python FastAPI from VPC Link"
  from_port         = 8000
  to_port           = 8000
  ip_protocol       = "tcp"
  cidr_ipv4         = var.vpc_cidr
}

resource "aws_vpc_security_group_egress_rule" "nlb_all" {
  security_group_id = aws_security_group.nlb.id
  description       = "NLB forwards to EC2 targets"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# --- Node.js EC2 rules ---

resource "aws_vpc_security_group_ingress_rule" "node_prod" {
  security_group_id            = aws_security_group.node.id
  description                  = "Prod traffic from NLB"
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.nlb.id
}

resource "aws_vpc_security_group_ingress_rule" "node_dev" {
  security_group_id            = aws_security_group.node.id
  description                  = "Dev traffic from NLB"
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.nlb.id
}

# Outbound 443 covers: SSM Session Manager, Secrets Manager, CloudWatch Logs,
# CodeDeploy agent -- all routed through NAT Gateway.
resource "aws_vpc_security_group_egress_rule" "node_https" {
  security_group_id = aws_security_group.node.id
  description       = "HTTPS to AWS services via NAT"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "node_rds" {
  security_group_id            = aws_security_group.node.id
  description                  = "PostgreSQL to RDS"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.rds.id
}

# --- Python EC2 rules ---

resource "aws_vpc_security_group_ingress_rule" "python_app" {
  security_group_id            = aws_security_group.python.id
  description                  = "FastAPI traffic from NLB"
  from_port                    = 8000
  to_port                      = 8000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.nlb.id
}

# Outbound 443 covers: SSM, Secrets Manager, CloudWatch, CodeDeploy, Groq API.
resource "aws_vpc_security_group_egress_rule" "python_https" {
  security_group_id = aws_security_group.python.id
  description       = "HTTPS to AWS services and Groq API via NAT"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "python_rds" {
  security_group_id            = aws_security_group.python.id
  description                  = "PostgreSQL to RDS"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.rds.id
}

# --- RDS rules ---
# No egress rules -- RDS is a managed service and needs none.

resource "aws_vpc_security_group_ingress_rule" "rds_from_node" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from Node.js ASG"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.node.id
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_python" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from Python ASG"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.python.id
}
