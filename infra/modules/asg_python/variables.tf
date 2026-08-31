variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "region" {
  description = "AWS region -- used in S3 sync for FAISS index"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for Python FastAPI servers"
  type        = string
  default     = "t3.small"
}

variable "min_size" {
  description = "ASG minimum instance count"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "ASG maximum instance count"
  type        = number
  default     = 2
}

variable "desired_capacity" {
  description = "ASG desired instance count"
  type        = number
  default     = 1
}

variable "private_app_subnet_ids" {
  description = "Private app subnet IDs -- ASG instances launch here"
  type        = list(string)
}

variable "python_sg_id" {
  description = "Python FastAPI EC2 security group ID"
  type        = string
}

variable "python_instance_profile_name" {
  description = "IAM instance profile name for Python EC2 instances"
  type        = string
}

variable "faiss_bucket_name" {
  description = "S3 bucket name for FAISS index -- hydrated to disk on boot"
  type        = string
}

variable "python_tg_arn" {
  description = "NLB target group ARN for Python FastAPI (port 8000)"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
