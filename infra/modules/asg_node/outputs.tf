output "asg_name" {
  description = "Node.js ASG name"
  value       = aws_autoscaling_group.node.name
}
