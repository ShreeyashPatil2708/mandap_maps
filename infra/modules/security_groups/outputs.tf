output "nlb_sg_id" {
  description = "NLB security group ID"
  value       = aws_security_group.nlb.id
}

output "node_sg_id" {
  description = "Node.js EC2 security group ID"
  value       = aws_security_group.node.id
}

output "python_sg_id" {
  description = "Python FastAPI EC2 security group ID"
  value       = aws_security_group.python.id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}
