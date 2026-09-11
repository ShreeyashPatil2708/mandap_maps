variable "name" {
  description = "Name prefix."
  type        = string
}

variable "data_subnet_ids" {
  description = "Private data subnets (no internet route) for the DB subnet group."
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security group allowing 5432 only from the app fleet."
  type        = string
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
}

variable "engine_version" {
  description = "Postgres major (or major.minor) version. Major-only lets RDS pick the latest supported minor."
  type        = string
  default     = "17"
}

variable "db_name" {
  description = "Initial database name."
  type        = string
}

variable "db_username" {
  description = "Master username."
  type        = string
}

variable "db_password" {
  description = "Master password (generated in the secrets module)."
  type        = string
  sensitive   = true
}

variable "admin_secret" {
  description = "Admin secret for the API write endpoints (generated in the secrets module)."
  type        = string
  sensitive   = true
}

variable "allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
}

variable "multi_az" {
  description = "Whether to run a standby in the second AZ."
  type        = bool
}

variable "database_secret_id" {
  description = "Secrets Manager id of the database secret to write connection details into."
  type        = string
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
