output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "vpc_cidr_block" {
  description = "VPC CIDR block"
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs (index 0 = AZ-a, index 1 = AZ-b)"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "Private app subnet IDs (index 0 = AZ-a, index 1 = AZ-b)"
  value       = aws_subnet.private_app[*].id
}

output "private_data_subnet_ids" {
  description = "Private data subnet IDs (index 0 = AZ-a, index 1 = AZ-b)"
  value       = aws_subnet.private_data[*].id
}

output "nat_gateway_id" {
  description = "NAT Gateway ID (single, AZ-a)"
  value       = aws_nat_gateway.this.id
}

output "private_app_route_table_id" {
  description = "Route table ID for private app subnets"
  value       = aws_route_table.private_app.id
}

output "s3_endpoint_id" {
  description = "S3 Gateway VPC endpoint ID"
  value       = aws_vpc_endpoint.s3.id
}
