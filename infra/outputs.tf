output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "Private app subnet IDs"
  value       = module.vpc.private_app_subnet_ids
}

output "private_data_subnet_ids" {
  description = "Private data subnet IDs"
  value       = module.vpc.private_data_subnet_ids
}

output "node_sg_id" {
  description = "Node.js EC2 security group ID"
  value       = module.security_groups.node_sg_id
}

output "python_sg_id" {
  description = "Python FastAPI EC2 security group ID"
  value       = module.security_groups.python_sg_id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = module.security_groups.rds_sg_id
}

output "github_actions_role_arn" {
  description = "GitHub Actions OIDC role ARN -- set as GH Actions secret AWS_ROLE_ARN"
  value       = module.iam.github_actions_role_arn
}

output "codedeploy_role_arn" {
  description = "CodeDeploy service role ARN"
  value       = module.iam.codedeploy_role_arn
}

output "acm_certificate_arn" {
  description = "Validated ACM certificate ARN (us-east-1) -- used by CloudFront"
  value       = module.acm.certificate_arn
}

output "acm_validation_records" {
  description = "CNAME records to add in Cloudflare to validate the ACM certificate"
  value       = module.acm.validation_records
}

output "db_secret_arn" {
  description = "Secrets Manager ARN for DB credentials -- set as GH Actions secret DB_SECRET_ARN"
  value       = module.rds.db_secret_arn
}

output "db_secret_name" {
  description = "Secrets Manager secret name -- apps call GetSecretValue at startup"
  value       = module.rds.db_secret_name
}

output "python_codedeploy_app_name" {
  description = "CodeDeploy app name for Python -- set as GH Actions secret"
  value       = module.asg_python.codedeploy_app_name
}

output "python_codedeploy_dg" {
  description = "CodeDeploy deployment group name for Python -- set as GH Actions secret"
  value       = module.asg_python.codedeploy_dg_name
}

output "node_codedeploy_app_name" {
  description = "CodeDeploy app name for Node.js -- set as GH Actions secret"
  value       = module.asg_node.codedeploy_app_name
}

output "node_codedeploy_prod_dg" {
  description = "CodeDeploy prod deployment group name -- set as GH Actions secret"
  value       = module.asg_node.codedeploy_prod_dg_name
}

output "node_codedeploy_dev_dg" {
  description = "CodeDeploy dev deployment group name -- set as GH Actions secret"
  value       = module.asg_node.codedeploy_dev_dg_name
}

output "api_endpoint" {
  description = "API Gateway invoke URL -- frontend calls this for all /api/* and /ai/* requests"
  value       = module.api_gateway.api_endpoint
}

output "node_prod_tg_arn" {
  description = "Node prod target group ARN -- referenced by ASG module"
  value       = module.nlb.node_prod_tg_arn
}

output "node_dev_tg_arn" {
  description = "Node dev target group ARN -- referenced by ASG module"
  value       = module.nlb.node_dev_tg_arn
}

output "python_tg_arn" {
  description = "Python target group ARN -- referenced by ASG module"
  value       = module.nlb.python_tg_arn
}

output "frontend_distribution_id" {
  description = "Frontend CloudFront distribution ID -- set as GH Actions secret CLOUDFRONT_DISTRIBUTION_ID"
  value       = module.cloudfront.frontend_distribution_id
}

output "frontend_distribution_domain" {
  description = "Frontend CloudFront domain -- add CNAME in Cloudflare: mandapmaps.in + www.mandapmaps.in → this value"
  value       = module.cloudfront.frontend_distribution_domain
}

output "media_distribution_domain" {
  description = "Media CloudFront domain -- add CNAME in Cloudflare: media.mandapmaps.in → this value"
  value       = module.cloudfront.media_distribution_domain
}

output "app_secret_name" {
  description = "Secrets Manager secret name for Groq key + chatbot Postgres URL -- populate after apply"
  value       = module.rds.app_secret_name
}

output "node_log_group" {
  description = "CloudWatch log group for Node.js app logs"
  value       = module.cloudwatch.node_log_group_name
}

output "python_log_group" {
  description = "CloudWatch log group for Python chatbot logs"
  value       = module.cloudwatch.python_log_group_name
}

output "festival_lambda_name" {
  description = "Festival Lambda function name -- invoke manually: aws lambda invoke --function-name <name> --payload '{\"action\":\"enable\"}'"
  value       = module.festival.lambda_function_name
}
