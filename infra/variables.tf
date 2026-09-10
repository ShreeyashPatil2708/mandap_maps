# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
variable "project" {
  description = "Short project name, used as a prefix for every resource."
  type        = string
  default     = "mandapmaps"
}

variable "region" {
  description = "Primary AWS region for the stack."
  type        = string
  default     = "ap-south-1"
}

variable "domain_name" {
  description = "Apex domain served from Cloudflare (for ACM certs and CORS)."
  type        = string
  default     = "mandapmaps.in"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to span (2 keeps cost sane while allowing RDS Multi-AZ)."
  type        = number
  default     = 2
}


# ---------------------------------------------------------------------------
# Edge / origin protection
# ---------------------------------------------------------------------------
variable "cloudflare_ipv4_cidrs" {
  description = <<-EOT
    Cloudflare's published IPv4 ranges. The ALB security group only accepts
    443/80 from these, so the origin cannot be hit directly. Refresh from
    https://www.cloudflare.com/ips/ when Cloudflare updates them.
  EOT
  type        = list(string)
  default = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
}

variable "origin_shared_secret" {
  description = <<-EOT
    Shared secret value that Cloudflare must send in the x-origin-secret header.
    The ALB rejects any /api request without it, so even a leaked ALB DNS name
    cannot be used to bypass Cloudflare. Set this in terraform.tfvars (do not
    commit it) and configure the matching Cloudflare Transform Rule.
  EOT
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Application fleets
# ---------------------------------------------------------------------------
variable "api_instance_type" {
  description = "On-demand Graviton instance type for the always-on API fleet."
  type        = string
  default     = "t4g.micro"
}

variable "api_min_size" {
  description = "Off-season minimum size of the API ASG."
  type        = number
  default     = 1
}

variable "api_max_size" {
  description = "Maximum size of the API ASG."
  type        = number
  default     = 3
}

variable "chatbot_instance_types" {
  description = <<-EOT
    Spot instance pool for the chatbot ASG. All must share one CPU architecture
    (x86_64 here) because a single launch template AMI cannot span arm64 + x86.
    Kept to the cheapest 2 GB types: t3a.small (AMD, usually cheapest) then
    t3.small. 1 GB types (t3.micro) are too small for torch + the embedding
    model + FAISS and would OOM.
  EOT
  type        = list(string)
  default     = ["t3a.small", "t3.small"]
}

variable "chatbot_min_size" {
  description = "Off-season minimum size of the chatbot ASG (0 = fully off between festivals)."
  type        = number
  default     = 0
}

variable "chatbot_max_size" {
  description = "Maximum size of the chatbot ASG (capped so Groq 429s do not amplify)."
  type        = number
  default     = 2
}

variable "ssh_key_name" {
  description = "Optional EC2 key pair name for break-glass SSH. Leave empty to rely on SSM Session Manager only."
  type        = string
  default     = ""
}

variable "app_repo_url" {
  description = "HTTPS git URL the instances clone the app from on boot."
  type        = string
  default     = "https://github.com/ShreeyashPatil2708/website.git"
}

variable "app_repo_branch" {
  description = "Branch instances check out on boot. Deploys pin a specific SHA via SSM afterwards."
  type        = string
  default     = "master"
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class. t4g.micro is free-tier eligible in year one."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "mandapmaps"
}

variable "db_username" {
  description = "Master username for RDS."
  type        = string
  default     = "mandapmaps"
}

variable "db_multi_az" {
  description = "Flip to true for festival week to get a standby in the second AZ."
  type        = bool
  default     = false
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
  default     = 20
}

# ---------------------------------------------------------------------------
# CI/CD
# ---------------------------------------------------------------------------
variable "github_repo" {
  description = "owner/repo allowed to assume the CD role via GitHub OIDC."
  type        = string
  default     = "ShreeyashPatil2708/mandap_maps"
}

variable "github_oidc_sub" {
  description = "Optional custom OIDC subject pattern for orgs that override GitHub's default sub claim template."
  type        = string
  default     = null
}

# ---------------------------------------------------------------------------
# Observability
# ---------------------------------------------------------------------------
variable "alarm_email" {
  description = "Email address that receives CloudWatch alarm notifications via SNS."
  type        = string
}

variable "monthly_budget_usd" {
  description = "AWS Budgets monthly cost cap that triggers an email alert."
  type        = number
  default     = 60
}
