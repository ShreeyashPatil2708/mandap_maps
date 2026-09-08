variable "name" {
  description = "Name prefix for VPC resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "azs" {
  description = "List of availability zone names to span."
  type        = list(string)
}

variable "nat_instance_type" {
  description = "Instance type for the NAT instance."
  type        = string
}

variable "nat_security_group_id" {
  description = "Security group id for the NAT instance."
  type        = string
}

variable "nat_instance_profile_name" {
  description = "IAM instance profile name for the NAT instance (SSM access)."
  type        = string
}

variable "ssh_key_name" {
  description = "Optional EC2 key pair name for the NAT instance."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
