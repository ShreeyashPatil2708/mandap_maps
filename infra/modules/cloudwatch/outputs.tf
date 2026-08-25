output "node_log_group_name" {
  description = "CloudWatch log group for Node.js application logs"
  value       = aws_cloudwatch_log_group.node_app.name
}

output "python_log_group_name" {
  description = "CloudWatch log group for Python chatbot logs"
  value       = aws_cloudwatch_log_group.python_app.name
}
