variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for the React frontend build"
  type        = string
}

variable "media_bucket_name" {
  description = "Name of the S3 bucket for Ganpati photos"
  type        = string
}

variable "faiss_bucket_name" {
  description = "Name of the S3 bucket for the FAISS index"
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
