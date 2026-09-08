variable "name" {
  description = "Name prefix for IAM resources."
  type        = string
}

variable "region" {
  description = "Primary AWS region (used to scope SSM permissions)."
  type        = string
}

variable "secret_arns" {
  description = "ARNs of the Secrets Manager secrets the app fleet may read."
  type        = list(string)
}

variable "readable_bucket_arns" {
  description = "ARNs of S3 buckets the app fleet may read (data/FAISS, photos)."
  type        = list(string)
}

variable "frontend_bucket_arn" {
  description = "ARN of the frontend bucket the CD role syncs the SPA into."
  type        = string
}

variable "github_repo" {
  description = "owner/repo trusted by the GitHub OIDC CD role."
  type        = string
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
