variable "name" {
  description = "Name prefix for security groups."
  type        = string
}

variable "vpc_id" {
  description = "VPC id the security groups belong to."
  type        = string
}

variable "cloudflare_ipv4_cidrs" {
  description = "Cloudflare IPv4 ranges allowed to reach the ALB on 80/443."
  type        = list(string)
}

variable "api_port" {
  description = "Port the Node API listens on."
  type        = number
  default     = 3000
}

variable "chatbot_port" {
  description = "Port the Python chatbot listens on."
  type        = number
  default     = 8000
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
