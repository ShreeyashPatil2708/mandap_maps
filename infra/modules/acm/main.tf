terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

# One cert covering the apex domain + all subdomains.
# Must be in us-east-1 -- CloudFront rejects certs from any other region.
resource "aws_acm_certificate" "main" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# Waits for the cert to reach ISSUED state.
# DNS is on Cloudflare -- add the CNAME records from the output below to
# Cloudflare, then this resource will complete (up to 75 min wait).
resource "aws_acm_certificate_validation" "main" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.main.arn
}
