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

variable "photos_bucket_id" {
  description = "Id of the private photos bucket CloudFront reads via OAC at /photos/*."
  type        = string
}

variable "photos_bucket_arn" {
  description = "ARN of the photos bucket (for the OAC bucket policy)."
  type        = string
}

variable "photos_bucket_regional_domain_name" {
  description = "Regional domain name of the photos bucket (the /photos/* CloudFront origin)."
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

variable "edge_auth_secret" {
  description = "When non-empty, requests without the x-mm-edge-auth header carrying this value are rejected at the edge (see the root variable)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "canonical_host" {
  description = "The one hostname pages should be served from (e.g. mandapmaps.in). Any other Host on the SPA behavior gets a 301 here, so www and the *.cloudfront.net name do not become duplicate copies of the site in search results. Empty disables the redirect."
  type        = string
  default     = ""
}

variable "aliases" {
  description = "Alternate domain names (CNAMEs) the distribution serves. Requires acm_certificate_arn to be set."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "us-east-1 ACM cert ARN covering the aliases. Empty uses the default *.cloudfront.net cert."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
