variable "name_prefix" {
  description = "Resource name prefix (e.g. mandapmaps-prod)"
  type        = string
}

variable "db_instance_identifier" {
  description = "RDS instance identifier -- the proxy targets this instance"
  type        = string
}

variable "db_secret_arn" {
  description = "Secrets Manager ARN with RDS credentials -- used by RDS Proxy for auth"
  type        = string
}

variable "db_subnet_group_name" {
  description = "RDS subnet group name -- proxy uses the same subnets"
  type        = string
}

variable "private_data_subnet_ids" {
  description = "Private data subnet IDs -- proxy uses the same subnets as RDS"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "RDS security group ID -- proxy gets the same access"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
