# ---------------------------------------------------------------------------
# Values you need for Cloudflare, GitHub secrets, and manual steps after apply.
# ---------------------------------------------------------------------------

output "cloudfront_domain_name" {
  description = "Point the Cloudflare record for the apex/SPA at this (proxied)."
  value       = module.cloudfront.domain_name
}

output "cdn_acm_validation_records" {
  description = "Add these DNS-only CNAMEs in Cloudflare to validate the CloudFront apex/www cert. Apply pauses until done."
  value = [
    for o in aws_acm_certificate.cdn.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

output "cloudfront_distribution_id" {
  description = "GitHub Actions secret CLOUDFRONT_DISTRIBUTION_ID."
  value       = module.cloudfront.distribution_id
}

output "alb_dns_name" {
  description = "Create a DNS-only (grey-cloud) Cloudflare record origin.<domain> pointing here, and route /api/* to it."
  value       = module.alb.alb_dns_name
}

output "acm_validation_records" {
  description = "Add these DNS-only CNAMEs in Cloudflare to validate the ALB origin cert (apply pauses until done)."
  value       = module.alb.acm_validation_records
}

output "cd_role_arn" {
  description = "GitHub Actions secret AWS_ROLE_ARN."
  value       = module.iam.cd_role_arn
}

output "frontend_bucket" {
  description = "GitHub Actions secret FRONTEND_BUCKET."
  value       = module.s3.frontend_bucket_id
}

output "photos_bucket" {
  description = "Upload curated responsive WebP variants here (aws s3 sync)."
  value       = module.s3.photos_bucket_id
}

output "data_bucket" {
  description = "Upload chatbot/seed-data.json and chatbot/faiss_index/ here."
  value       = module.s3.data_bucket_id
}

output "api_asg_name" {
  description = "SSM deploy target for the Node API."
  value       = module.api_fleet.asg_name
}

output "chatbot_asg_name" {
  description = "SSM deploy target for the Python chatbot."
  value       = module.chatbot_fleet.asg_name
}

output "rds_endpoint" {
  description = "RDS endpoint (private). Reach it from an app instance via SSM to run migrations/seed."
  value       = module.rds.endpoint
}

output "database_secret_name" {
  value = local.db_secret_name
}

output "app_secret_name" {
  value = local.app_secret_name
}
