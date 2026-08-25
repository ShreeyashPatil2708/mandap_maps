variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "node_asg_name" {
  description = "Node.js ASG name -- used for CPU alarm dimension"
  type        = string
}

variable "python_asg_name" {
  description = "Python ASG name -- used for CPU alarm dimension"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance identifier -- used for connection count alarm"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
