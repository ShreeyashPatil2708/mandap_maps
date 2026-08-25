output "certificate_arn" {
  description = "Validated ACM certificate ARN -- used by CloudFront distributions"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "validation_records" {
  description = "CNAME records to add to Cloudflare DNS to validate the certificate"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}
