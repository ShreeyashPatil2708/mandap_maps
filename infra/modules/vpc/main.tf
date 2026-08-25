locals {
  azs = ["${var.region}a", "${var.region}b"]
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

# Public subnets -- only purpose is to host the NAT Gateway (AZ-a) and serve
# as the entry point for any future public-facing resources.
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = local.azs[count.index]

  # Explicit false: nothing in these subnets gets a public IP automatically.
  map_public_ip_on_launch = false

  tags = { Name = "${var.name_prefix}-public-${local.azs[count.index]}" }
}

# Private app subnets -- EC2 ASGs and internal NLB.
resource "aws_subnet" "private_app" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 10 + count.index)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.name_prefix}-private-app-${local.azs[count.index]}"
    Tier = "app"
  }
}

# Private data subnets -- RDS only. No route to the internet.
resource "aws_subnet" "private_data" {
  count             = 2
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 20 + count.index)
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${var.name_prefix}-private-data-${local.azs[count.index]}"
    Tier = "data"
  }
}

# Single NAT Gateway in AZ-a.
# TODO (production hardening): add a second NAT in AZ-b with a separate private
# route table per AZ to eliminate the cross-AZ dependency on NAT failure.
resource "aws_eip" "nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.this]
  tags       = { Name = "${var.name_prefix}-nat-eip" }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = { Name = "${var.name_prefix}-nat" }
}

# --- Route tables ---

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = { Name = "${var.name_prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Both app AZs share one route table pointing at the single NAT in AZ-a.
resource "aws_route_table" "private_app" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this.id
  }

  tags = { Name = "${var.name_prefix}-rt-private-app" }
}

resource "aws_route_table_association" "private_app" {
  count          = 2
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app.id
}

# Data subnets: local routes only. RDS has no reason to reach the internet.
resource "aws_route_table" "private_data" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name_prefix}-rt-private-data" }
}

resource "aws_route_table_association" "private_data" {
  count          = 2
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = aws_route_table.private_data.id
}

# S3 Gateway endpoint -- free, keeps S3 traffic (CodeDeploy bundles, FAISS
# index sync) inside the AWS network and off the NAT Gateway.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private_app.id]

  tags = { Name = "${var.name_prefix}-vpce-s3" }
}
