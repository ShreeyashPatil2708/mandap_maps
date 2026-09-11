# Three subnet tiers per AZ:
#   public       - ALB (route to IGW)
#   app          - API and chatbot instances (public IPs, egress direct via IGW)
#   data-private - RDS only (no internet route at all)
#
# The app tier reaches the internet directly through the Internet Gateway (no
# NAT box) to keep cost minimal; inbound is closed by the app security group
# (ALB-only), so the public IPs are outbound-only in practice.
#
# The /24 layout leaves plenty of room and keeps the CIDR math readable.
#   public       10.0.0.0/24,  10.0.1.0/24
#   app          10.0.10.0/24, 10.0.11.0/24
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
  # App instances egress directly via the IGW (no NAT box), so they need a
  # public IP. Inbound stays closed by the app security group (ALB-only).
  map_public_ip_on_launch = true

  tags = merge(var.tags, { Name = "${var.name}-app-${var.azs[count.index]}", Tier = "app" })
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

data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# App routing: direct egress via the Internet Gateway (no NAT instance).
# ---------------------------------------------------------------------------
resource "aws_route_table" "app" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name}-app-rt" })
}

resource "aws_route" "app_internet" {
  route_table_id         = aws_route_table.app.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
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
