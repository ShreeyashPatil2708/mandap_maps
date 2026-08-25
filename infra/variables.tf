variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "dev"], var.environment)
    error_message = "environment must be prod or dev"
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "github_repo" {
  description = "GitHub repo in owner/repo format -- scopes the OIDC trust to this repo only"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g. mandapmaps.in)"
  type        = string
  default     = "mandapmaps.in"
}
