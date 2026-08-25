output "asg_name" {
  description = "Node.js ASG name"
  value       = aws_autoscaling_group.node.name
}

output "codedeploy_app_name" {
  description = "CodeDeploy application name for Node.js -- used in GitHub Actions cd.yml"
  value       = aws_codedeploy_app.node.name
}

output "codedeploy_prod_dg_name" {
  description = "CodeDeploy prod deployment group name -- used in GitHub Actions cd.yml"
  value       = aws_codedeploy_deployment_group.prod.deployment_group_name
}

output "codedeploy_dev_dg_name" {
  description = "CodeDeploy dev deployment group name -- used in GitHub Actions cd.yml"
  value       = aws_codedeploy_deployment_group.dev.deployment_group_name
}
