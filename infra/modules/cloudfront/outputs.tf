output "distribution_id" {
  description = "Set this as the CLOUDFRONT_DISTRIBUTION_ID GitHub Actions secret."
  value       = aws_cloudfront_distribution.this.id
}

output "domain_name" {
  description = "CloudFront domain. Point the Cloudflare SPA record at this (grey-cloud or proxied)."
  value       = aws_cloudfront_distribution.this.domain_name
}
