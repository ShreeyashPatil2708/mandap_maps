variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g. mandapmaps.in)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN in us-east-1 -- required by CloudFront"
  type        = string
}

variable "api_gateway_domain" {
  description = "API Gateway domain (host only, no scheme) used as the /api/* origin"
  type        = string
}

variable "frontend_bucket_id" {
  description = "Frontend S3 bucket name"
  type        = string
}

variable "frontend_bucket_arn" {
  description = "Frontend S3 bucket ARN"
  type        = string
}

variable "frontend_bucket_regional_domain" {
  description = "Frontend S3 bucket regional domain name"
  type        = string
}

variable "media_bucket_id" {
  description = "Media S3 bucket name"
  type        = string
}

variable "media_bucket_arn" {
  description = "Media S3 bucket ARN"
  type        = string
}

variable "media_bucket_regional_domain" {
  description = "Media S3 bucket regional domain name"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
