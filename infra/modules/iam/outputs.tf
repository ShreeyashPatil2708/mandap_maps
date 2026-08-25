output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC role -- add as GH Actions secret AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}

output "node_ec2_instance_profile_name" {
  description = "Instance profile name for Node.js ASG launch template"
  value       = aws_iam_instance_profile.node_ec2.name
}

output "python_ec2_instance_profile_name" {
  description = "Instance profile name for Python ASG launch template"
  value       = aws_iam_instance_profile.python_ec2.name
}

output "codedeploy_role_arn" {
  description = "ARN of the CodeDeploy service role"
  value       = aws_iam_role.codedeploy.arn
}
