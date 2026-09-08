output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "app_subnet_ids" {
  value = aws_subnet.app[*].id
}

output "data_subnet_ids" {
  value = aws_subnet.data[*].id
}

output "nat_instance_id" {
  value = aws_instance.nat.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}
