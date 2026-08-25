variable "name_prefix" {
  description = "Prefix applied to all resource names"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo in owner/repo format -- scopes OIDC trust to this repo only"
  type        = string
}

variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for the React frontend build"
  type        = string
}

variable "faiss_bucket_name" {
  description = "Name of the S3 bucket storing the FAISS index"
  type        = string
}

variable "codedeploy_bucket_name" {
  description = "Name of the S3 bucket for CodeDeploy deployment bundles"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
