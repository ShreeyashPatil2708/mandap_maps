variable "name" {
  description = "Full name of this fleet, e.g. mandapmaps-api or mandapmaps-chatbot."
  type        = string
}

variable "role" {
  description = "Fleet role tag: api or chatbot."
  type        = string
}

variable "ami_id" {
  description = "AMI id (arm64 for the API fleet, x86_64 for the chatbot fleet)."
  type        = string
}

variable "instance_types" {
  description = "Instance type pool. One entry for on-demand, several for a diversified Spot pool."
  type        = list(string)
}

variable "capacity_type" {
  description = "on-demand or spot."
  type        = string
  validation {
    condition     = contains(["on-demand", "spot"], var.capacity_type)
    error_message = "capacity_type must be on-demand or spot."
  }
}

variable "min_size" {
  type = number
}

variable "max_size" {
  type = number
}

variable "desired_capacity" {
  type = number
}

variable "subnet_ids" {
  description = "App-private subnets the instances launch into."
  type        = list(string)
}

variable "security_group_id" {
  type = string
}

variable "instance_profile_name" {
  type = string
}

variable "target_group_arns" {
  description = "ALB target groups to register with."
  type        = list(string)
}

variable "user_data" {
  description = "Rendered cloud-init user-data script."
  type        = string
}

variable "key_name" {
  description = "Optional EC2 key pair for break-glass SSH."
  type        = string
  default     = ""
}

variable "health_check_grace_period" {
  description = "Seconds to wait for boot before ELB health checks can mark an instance unhealthy."
  type        = number
  default     = 300
}

variable "detailed_monitoring" {
  description = "Enable 1-minute EC2 metrics."
  type        = bool
  default     = false
}

variable "root_volume_size" {
  description = "Root EBS size in GB."
  type        = number
  default     = 20
}

variable "cpu_target" {
  description = "If > 0, add a target-tracking policy on average CPU."
  type        = number
  default     = 0
}

variable "alb_request_target" {
  description = "If > 0, add a target-tracking policy on ALB requests per target."
  type        = number
  default     = 0
}

variable "alb_resource_label" {
  description = "app/<alb-name>/<id>/targetgroup/<tg-name>/<id> for the ALB request tracking policy."
  type        = string
  default     = ""
}

variable "scheduled_actions" {
  description = "Map of scheduled scaling actions: name => { recurrence, min_size, max_size, desired_capacity }."
  type = map(object({
    recurrence       = string
    min_size         = number
    max_size         = number
    desired_capacity = number
  }))
  default = {}
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
