variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "domain_name" {
  description = "Root domain name -- used for CORS allow_origins"
  type        = string
}

variable "nlb_sg_id" {
  description = "NLB security group ID -- attached to the VPC Link ENIs"
  type        = string
}

variable "private_app_subnet_ids" {
  description = "Private app subnet IDs -- VPC Link ENIs are placed here"
  type        = list(string)
}

variable "node_prod_listener_arn" {
  description = "NLB listener ARN for Node prod (port 3000)"
  type        = string
}

variable "python_listener_arn" {
  description = "NLB listener ARN for Python FastAPI (port 8000)"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
