variable "name" {
  description = "Name prefix."
  type        = string
}

variable "frontend_bucket_id" {
  description = "Id of the private frontend bucket CloudFront reads via OAC."
  type        = string
}

variable "frontend_bucket_arn" {
  description = "ARN of the frontend bucket (for the OAC bucket policy)."
  type        = string
}

variable "frontend_bucket_regional_domain_name" {
  description = "Regional domain name of the frontend bucket (the CloudFront origin)."
  type        = string
}

variable "alb_origin_domain" {
  description = "Public origin hostname for the ALB (e.g. origin.<domain>), used as the /api/* CloudFront origin. Must have a valid ACM cert matching this name."
  type        = string
}

variable "origin_shared_secret" {
  description = "Secret CloudFront injects as the x-origin-secret header so the ALB accepts only requests coming through the edge."
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
