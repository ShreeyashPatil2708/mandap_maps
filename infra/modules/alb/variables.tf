variable "name" {
  description = "Name prefix."
  type        = string
}

variable "vpc_id" {
  description = "VPC id."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets the ALB lives in."
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group locked to Cloudflare ranges."
  type        = string
}

variable "origin_host" {
  description = "Hostname Cloudflare connects to for the origin (used for the ACM cert). Create a DNS-only record for this pointing at the ALB in Cloudflare."
  type        = string
}

variable "origin_shared_secret" {
  description = "Secret required in the x-origin-secret header on every /api request."
  type        = string
  sensitive   = true
}

variable "api_port" {
  description = "Node API port."
  type        = number
  default     = 3000
}

variable "chatbot_port" {
  description = "Python chatbot port."
  type        = number
  default     = 8000
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
