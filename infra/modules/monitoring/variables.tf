variable "name" {
  description = "Name prefix."
  type        = string
}

variable "region" {
  type = string
}

variable "alarm_email" {
  description = "Email subscribed to the alarm SNS topic."
  type        = string
}

variable "log_group_name" {
  description = "App/system log group name (retention set here)."
  type        = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "api_tg_arn_suffix" {
  type = string
}

variable "chatbot_tg_arn_suffix" {
  type = string
}

variable "rds_identifier" {
  type = string
}

variable "nat_instance_id" {
  type = string
}

variable "api_asg_name" {
  type = string
}

variable "chatbot_asg_name" {
  type = string
}

variable "monthly_budget_usd" {
  type = number
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
