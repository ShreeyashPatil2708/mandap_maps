output "nlb_arn" {
  description = "Internal NLB ARN"
  value       = aws_lb.main.arn
}

output "node_prod_listener_arn" {
  description = "NLB listener ARN for Node prod (port 3000) -- used as API Gateway integration URI"
  value       = aws_lb_listener.node_prod.arn
}

output "node_dev_listener_arn" {
  description = "NLB listener ARN for Node dev (port 3001)"
  value       = aws_lb_listener.node_dev.arn
}

output "python_listener_arn" {
  description = "NLB listener ARN for Python FastAPI (port 8000) -- used as API Gateway integration URI"
  value       = aws_lb_listener.python.arn
}

output "node_prod_tg_arn" {
  description = "Node prod target group ARN -- attach to ASG"
  value       = aws_lb_target_group.node_prod.arn
}

output "node_prod_tg_name" {
  description = "Node prod target group name -- used by CodeDeploy load_balancer_info"
  value       = aws_lb_target_group.node_prod.name
}

output "node_dev_tg_arn" {
  description = "Node dev target group ARN -- attach to ASG"
  value       = aws_lb_target_group.node_dev.arn
}

output "node_dev_tg_name" {
  description = "Node dev target group name -- used by CodeDeploy load_balancer_info"
  value       = aws_lb_target_group.node_dev.name
}

output "python_tg_arn" {
  description = "Python target group ARN -- attach to ASG"
  value       = aws_lb_target_group.python.arn
}

output "python_tg_name" {
  description = "Python target group name -- used by CodeDeploy load_balancer_info"
  value       = aws_lb_target_group.python.name
}
