# Three subnet tiers per AZ:
#   public       - ALB and the NAT instance (route to IGW)
#   app-private  - API and chatbot instances (egress via NAT instance)
#   data-private - RDS only (no internet route at all)
#
# The /24 layout leaves plenty of room and keeps the CIDR math readable.
#   public       10.0.0.0/24,  10.0.1.0/24
#   app-private  10.0.10.0/24, 10.0.11.0/24
#   data-private 10.0.20.0/24, 10.0.21.0/24

locals {
  public_subnets = [for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i)]
  app_subnets    = [for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i + 10)]
  data_subnets   = [for i, az in var.azs : cidrsubnet(var.vpc_cidr, 8, i + 20)]
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = "${var.name}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-igw" })
}

# ---------------------------------------------------------------------------
# Subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, { Name = "${var.name}-public-${var.azs[count.index]}", Tier = "public" })
}

resource "aws_subnet" "app" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = local.app_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(var.tags, { Name = "${var.name}-app-${var.azs[count.index]}", Tier = "app-private" })
}

resource "aws_subnet" "data" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = local.data_subnets[count.index]
  availability_zone = var.azs[count.index]

  tags = merge(var.tags, { Name = "${var.name}-data-${var.azs[count.index]}", Tier = "data-private" })
}

# ---------------------------------------------------------------------------
# Public routing
# ---------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-public-rt" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ---------------------------------------------------------------------------
# NAT instance (cheap replacement for a NAT Gateway)
# ---------------------------------------------------------------------------
# Latest Amazon Linux 2023 x86_64 AMI. The NAT box is x86 (t3.nano): Graviton
# (t4g) capacity in ap-south-1 can be tight, and x86 nano capacity is reliable.
# NAT is plumbing, not app compute, so it does not need to be Graviton.
data "aws_ami" "al2023_x86" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "nat" {
  ami                    = data.aws_ami.al2023_x86.id
  instance_type          = var.nat_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [var.nat_security_group_id]
  iam_instance_profile   = var.nat_instance_profile_name
  key_name               = var.ssh_key_name != "" ? var.ssh_key_name : null

  # A NAT instance must forward packets for other hosts, so source/dest checking
  # (which drops traffic not addressed to this ENI) has to be turned off.
  source_dest_check = false

  # Enable IP forwarding and masquerade app-private traffic out of the primary
  # interface. iptables-nft ships with AL2023.
  user_data = <<-EOF
    #!/bin/bash
    set -euxo pipefail
    dnf install -y iptables-services
    sysctl -w net.ipv4.ip_forward=1
    echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/99-nat.conf
    PRIMARY_IF=$(ip -o -4 route show to default | awk '{print $5}')
    iptables -t nat -A POSTROUTING -o "$PRIMARY_IF" -j MASQUERADE
    iptables -A FORWARD -i "$PRIMARY_IF" -o "$PRIMARY_IF" -m state --state RELATED,ESTABLISHED -j ACCEPT
    iptables -A FORWARD -o "$PRIMARY_IF" -j ACCEPT
    service iptables save
    systemctl enable --now iptables
  EOF

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = merge(var.tags, { Name = "${var.name}-nat" })

  # The AMI data source is most_recent, so a new AL2023 release would otherwise
  # force-replace the NAT on every apply (a needless egress blip). Pin to the
  # AMI captured at create time; roll it deliberately by tainting when desired.
  lifecycle {
    ignore_changes = [ami]
  }
}

# Auto-recovery for the single NAT box: if the underlying hardware fails,
# CloudWatch recovers the instance (same ENI, same private IP) so egress
# resumes without manual intervention. This mitigates the single-box SPOF.
resource "aws_cloudwatch_metric_alarm" "nat_recover" {
  alarm_name          = "${var.name}-nat-auto-recover"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 60
  evaluation_periods  = 2
  alarm_actions       = ["arn:aws:automate:${data.aws_region.current.name}:ec2:recover"]

  dimensions = {
    InstanceId = aws_instance.nat.id
  }

  tags = var.tags
}

data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# Private (app) routing via the NAT instance
# ---------------------------------------------------------------------------
resource "aws_route_table" "app" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-app-rt" })
}

resource "aws_route" "app_nat" {
  route_table_id         = aws_route_table.app.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat.primary_network_interface_id
}

resource "aws_route_table_association" "app" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app.id
}

# ---------------------------------------------------------------------------
# Data routing (no internet route: RDS has no egress path)
# ---------------------------------------------------------------------------
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-data-rt" })
}

resource "aws_route_table_association" "data" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

# ---------------------------------------------------------------------------
# S3 gateway endpoint (free). Keeps S3 traffic off the NAT instance, which
# matters for photo and FAISS-index pulls during a festival.
# ---------------------------------------------------------------------------
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [
    aws_route_table.app.id,
    aws_route_table.data.id,
  ]

  tags = merge(var.tags, { Name = "${var.name}-s3-endpoint" })
}
