variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for Node.js servers"
  type        = string
  default     = "t3.micro"
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

variable "node_sg_id" {
  description = "Node.js EC2 security group ID"
  type        = string
}

variable "node_instance_profile_name" {
  description = "IAM instance profile name for Node.js EC2 instances"
  type        = string
}

variable "node_prod_tg_arn" {
  description = "NLB target group ARN for Node prod (port 3000)"
  type        = string
}

variable "node_dev_tg_arn" {
  description = "NLB target group ARN for Node dev (port 3001)"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
