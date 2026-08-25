output "frontend_distribution_id" {
  description = "Frontend CloudFront distribution ID -- used for cache invalidations in CI/CD"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_distribution_domain" {
  description = "Frontend CloudFront domain name -- add as CNAME target in Cloudflare for mandapmaps.in and www.mandapmaps.in"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "media_distribution_id" {
  description = "Media CloudFront distribution ID"
  value       = aws_cloudfront_distribution.media.id
}

output "media_distribution_domain" {
  description = "Media CloudFront domain name -- add as CNAME target in Cloudflare for media.mandapmaps.in"
  value       = aws_cloudfront_distribution.media.domain_name
}
