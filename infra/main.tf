# ---------------------------------------------------------------------------
# AMIs: Amazon Linux 2023. arm64 for the Graviton API fleet, x86_64 for the
# chatbot fleet (torch / faiss-cpu wheels are simplest on x86).
# ---------------------------------------------------------------------------
data "aws_ami" "al2023_arm" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_ami" "al2023_x86" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ---------------------------------------------------------------------------
# Secrets (created early: the RDS module writes the DB secret version, the app
# fleet reads both at boot, IAM scopes read access to their ARNs).
# ---------------------------------------------------------------------------
module "secrets" {
  source = "./modules/secrets"

  database_secret_name = local.db_secret_name
  app_secret_name      = local.app_secret_name
  tags                 = local.common_tags
}

# ---------------------------------------------------------------------------
# S3 (frontend, photos, data). Frontend bucket policy is owned by cloudfront.
# ---------------------------------------------------------------------------
module "s3" {
  source = "./modules/s3"

  name = local.name
  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# IAM (instance profiles + GitHub OIDC CD role).
# ---------------------------------------------------------------------------
module "iam" {
  source = "./modules/iam"

  name            = local.name
  region          = var.region
  github_repo     = var.github_repo
  github_oidc_sub = var.github_oidc_sub

  secret_arns = [
    module.secrets.database_secret_arn,
    module.secrets.app_secret_arn,
  ]
  readable_bucket_arns = [
    module.s3.data_bucket_arn,
    module.s3.photos_bucket_arn,
  ]
  frontend_bucket_arn = module.s3.frontend_bucket_arn

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# Security groups.
# ---------------------------------------------------------------------------
module "security_groups" {
  source = "./modules/security_groups"

  name                  = local.name
  vpc_id                = module.vpc.vpc_id
  vpc_cidr              = module.vpc.vpc_cidr
  cloudflare_ipv4_cidrs = var.cloudflare_ipv4_cidrs
  api_port              = local.api_port
  chatbot_port          = local.chatbot_port
  tags                  = local.common_tags
}

# ---------------------------------------------------------------------------
# VPC (needs the NAT security group + profile, so it consumes IAM/SG outputs).
# ---------------------------------------------------------------------------
module "vpc" {
  source = "./modules/vpc"

  name                      = local.name
  vpc_cidr                  = var.vpc_cidr
  azs                       = local.azs
  nat_instance_type         = var.nat_instance_type
  nat_security_group_id     = module.security_groups.nat_sg_id
  nat_instance_profile_name = module.iam.nat_instance_profile_name
  ssh_key_name              = var.ssh_key_name
  tags                      = local.common_tags
}

# ---------------------------------------------------------------------------
# RDS.
# ---------------------------------------------------------------------------
module "rds" {
  source = "./modules/rds"

  name               = local.name
  data_subnet_ids    = module.vpc.data_subnet_ids
  rds_sg_id          = module.security_groups.rds_sg_id
  instance_class     = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = module.secrets.db_password
  admin_secret       = module.secrets.admin_secret
  allocated_storage  = var.db_allocated_storage
  multi_az           = var.db_multi_az
  database_secret_id = module.secrets.database_secret_id
  tags               = local.common_tags
}

# ---------------------------------------------------------------------------
# CloudFront (SPA front door) + frontend bucket policy.
# ---------------------------------------------------------------------------
module "cloudfront" {
  source = "./modules/cloudfront"

  name                                 = local.name
  frontend_bucket_id                   = module.s3.frontend_bucket_id
  frontend_bucket_arn                  = module.s3.frontend_bucket_arn
  frontend_bucket_regional_domain_name = module.s3.frontend_bucket_regional_domain_name
  alb_origin_domain                    = "origin.${var.domain_name}"
  origin_shared_secret                 = var.origin_shared_secret
  tags                                 = local.common_tags
}

# ---------------------------------------------------------------------------
# ALB (origin for /api, behind Cloudflare).
# ---------------------------------------------------------------------------
module "alb" {
  source = "./modules/alb"

  name                 = local.name
  vpc_id               = module.vpc.vpc_id
  public_subnet_ids    = module.vpc.public_subnet_ids
  alb_sg_id            = module.security_groups.alb_sg_id
  origin_host          = "origin.${var.domain_name}"
  origin_shared_secret = var.origin_shared_secret
  api_port             = local.api_port
  chatbot_port         = local.chatbot_port
  tags                 = local.common_tags
}

# ---------------------------------------------------------------------------
# Monitoring (log group retention, alarms, dashboard, budget).
# ---------------------------------------------------------------------------
module "monitoring" {
  source = "./modules/monitoring"

  name                  = local.name
  region                = var.region
  alarm_email           = var.alarm_email
  log_group_name        = local.log_group_name
  alb_arn_suffix        = module.alb.alb_arn_suffix
  api_tg_arn_suffix     = module.alb.api_tg_arn_suffix
  chatbot_tg_arn_suffix = module.alb.chatbot_tg_arn_suffix
  rds_identifier        = module.rds.identifier
  nat_instance_id       = module.vpc.nat_instance_id
  api_asg_name          = module.api_fleet.asg_name
  chatbot_asg_name      = module.chatbot_fleet.asg_name
  monthly_budget_usd    = var.monthly_budget_usd
  tags                  = local.common_tags
}

# ---------------------------------------------------------------------------
# API fleet: always-on, on-demand Graviton, target-tracked on ALB requests.
# ---------------------------------------------------------------------------
module "api_fleet" {
  source = "./modules/asg"

  name = "${local.name}-api"
  role = "api"
  # Both AMI and every fallback type are arm64 (one launch-template AMI cannot
  # span architectures). Multiple sizes let the on-demand allocation strategy
  # fall back when one type is capacity-constrained in an AZ.
  ami_id = data.aws_ami.al2023_arm.id
  # Free plan only covers t4g.micro (Graviton free trial). The t4g.small fallback
  # is blocked, so keep the API pool to the single free-tier type.
  instance_types        = [var.api_instance_type]
  capacity_type         = "on-demand"
  min_size              = var.api_min_size
  max_size              = var.api_max_size
  desired_capacity      = var.api_min_size
  subnet_ids            = module.vpc.app_subnet_ids
  security_group_id     = module.security_groups.app_sg_id
  instance_profile_name = module.iam.app_instance_profile_name
  target_group_arns     = [module.alb.api_target_group_arn]
  key_name              = var.ssh_key_name

  health_check_grace_period = 300
  detailed_monitoring       = true
  alb_request_target        = 300
  alb_resource_label        = module.alb.api_resource_label

  user_data = templatefile("${path.module}/templates/api-user-data.sh.tftpl", {
    region       = var.region
    repo_url     = var.app_repo_url
    repo_branch  = var.app_repo_branch
    db_secret_id = local.db_secret_name
    api_port     = local.api_port
    cors_origins = local.cors_origins
    log_group    = local.log_group_name
  })

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# Chatbot fleet: all-Spot x86 pool, off-season desired 0.
# ---------------------------------------------------------------------------
module "chatbot_fleet" {
  source = "./modules/asg"

  name                  = "${local.name}-chatbot"
  role                  = "chatbot"
  ami_id                = data.aws_ami.al2023_x86.id
  instance_types        = var.chatbot_instance_types
  capacity_type         = "spot"
  min_size              = var.chatbot_min_size
  max_size              = var.chatbot_max_size
  desired_capacity      = var.chatbot_min_size
  subnet_ids            = module.vpc.app_subnet_ids
  security_group_id     = module.security_groups.app_sg_id
  instance_profile_name = module.iam.app_instance_profile_name
  target_group_arns     = [module.alb.chatbot_target_group_arn]
  key_name              = var.ssh_key_name

  # Model load makes cold boot slow; give it room before health checks bite.
  health_check_grace_period = 600
  cpu_target                = 60

  user_data = templatefile("${path.module}/templates/chatbot-user-data.sh.tftpl", {
    region          = var.region
    repo_url        = var.app_repo_url
    repo_branch     = var.app_repo_branch
    db_secret_id    = local.db_secret_name
    app_secret_id   = local.app_secret_name
    data_bucket     = module.s3.data_bucket_id
    allowed_origins = local.allowed_origins_json
    log_group       = local.log_group_name
  })

  tags = local.common_tags
}
