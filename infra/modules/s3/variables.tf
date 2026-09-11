variable "name" {
  description = "Name prefix for buckets."
  type        = string
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
