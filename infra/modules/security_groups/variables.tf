variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block -- used to scope NLB inbound to within the VPC"
  type        = string
}

variable "name_prefix" {
  description = "Prefix applied to all resource names"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
