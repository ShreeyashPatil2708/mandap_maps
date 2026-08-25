output "asg_name" {
  description = "Python ASG name"
  value       = aws_autoscaling_group.python.name
}

output "codedeploy_app_name" {
  description = "CodeDeploy application name for Python -- used in GitHub Actions cd.yml"
  value       = aws_codedeploy_app.python.name
}

output "codedeploy_dg_name" {
  description = "CodeDeploy deployment group name for Python -- used in GitHub Actions cd.yml"
  value       = aws_codedeploy_deployment_group.python.deployment_group_name
}
