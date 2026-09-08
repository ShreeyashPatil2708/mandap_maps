output "app_instance_profile_name" {
  value = aws_iam_instance_profile.app.name
}

output "app_role_arn" {
  value = aws_iam_role.app.arn
}

output "nat_instance_profile_name" {
  value = aws_iam_instance_profile.nat.name
}

output "cd_role_arn" {
  description = "Set this as the AWS_ROLE_ARN GitHub Actions secret."
  value       = aws_iam_role.cd.arn
}
