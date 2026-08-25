variable "domain_name" {
  description = "Root domain name (e.g. mandapmaps.in)"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
