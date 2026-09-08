variable "project" {
  description = "Project name, used as a prefix for the state bucket and lock table."
  type        = string
  default     = "mandapmaps"
}

variable "region" {
  description = "AWS region for the state backend. Keep this the same as the root stack region."
  type        = string
  default     = "ap-south-1"
}
