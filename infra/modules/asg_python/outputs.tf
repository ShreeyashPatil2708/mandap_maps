output "asg_name" {
  description = "Python ASG name"
  value       = aws_autoscaling_group.python.name
}
