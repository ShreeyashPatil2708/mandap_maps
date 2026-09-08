variable "database_secret_name" {
  description = "Name of the database secret (DB creds + admin secret)."
  type        = string
}

variable "app_secret_name" {
  description = "Name of the app secret (Groq + ingest keys)."
  type        = string
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
