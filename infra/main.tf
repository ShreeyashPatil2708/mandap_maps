terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}

data "aws_caller_identity" "current" {}

module "vpc" {
  source      = "./modules/vpc"
  region      = var.region
  name_prefix = local.name_prefix
  vpc_cidr    = var.vpc_cidr
  tags        = local.common_tags
}

module "security_groups" {
  source      = "./modules/security_groups"
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = module.vpc.vpc_cidr_block
  name_prefix = local.name_prefix
  tags        = local.common_tags
}

module "s3" {
  source                 = "./modules/s3"
  frontend_bucket_name   = local.frontend_bucket_name
  media_bucket_name      = local.media_bucket_name
  faiss_bucket_name      = local.faiss_bucket_name
  codedeploy_bucket_name = local.codedeploy_bucket_name
  tags                   = local.common_tags
}

module "acm" {
  source      = "./modules/acm"
  domain_name = var.domain_name
  tags        = local.common_tags

  providers = {
    aws.us_east_1 = aws.us_east_1
  }
}

module "iam" {
  source                 = "./modules/iam"
  name_prefix            = local.name_prefix
  github_repo            = var.github_repo
  frontend_bucket_name   = local.frontend_bucket_name
  faiss_bucket_name      = local.faiss_bucket_name
  codedeploy_bucket_name = local.codedeploy_bucket_name
  tags                   = local.common_tags
}

module "nlb" {
  source                 = "./modules/nlb"
  name_prefix            = local.name_prefix
  vpc_id                 = module.vpc.vpc_id
  private_app_subnet_ids = module.vpc.private_app_subnet_ids
  nlb_sg_id              = module.security_groups.nlb_sg_id
  tags                   = local.common_tags
}

module "api_gateway" {
  source                 = "./modules/api_gateway"
  name_prefix            = local.name_prefix
  domain_name            = var.domain_name
  nlb_sg_id              = module.security_groups.nlb_sg_id
  private_app_subnet_ids = module.vpc.private_app_subnet_ids
  node_prod_listener_arn = module.nlb.node_prod_listener_arn
  python_listener_arn    = module.nlb.python_listener_arn
  tags                   = local.common_tags
}

module "asg_node" {
  source      = "./modules/asg_node"
  name_prefix = local.name_prefix
  region      = var.region
  tags        = local.common_tags

  private_app_subnet_ids     = module.vpc.private_app_subnet_ids
  node_sg_id                 = module.security_groups.node_sg_id
  node_instance_profile_name = module.iam.node_ec2_instance_profile_name

  node_prod_tg_arn = module.nlb.node_prod_tg_arn
  node_dev_tg_arn  = module.nlb.node_dev_tg_arn
}

module "rds" {
  source      = "./modules/rds"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  private_data_subnet_ids = module.vpc.private_data_subnet_ids
  rds_sg_id               = module.security_groups.rds_sg_id
}

module "asg_python" {
  source      = "./modules/asg_python"
  name_prefix = local.name_prefix
  region      = var.region
  tags        = local.common_tags

  private_app_subnet_ids       = module.vpc.private_app_subnet_ids
  python_sg_id                 = module.security_groups.python_sg_id
  python_instance_profile_name = module.iam.python_ec2_instance_profile_name
  faiss_bucket_name            = local.faiss_bucket_name

  python_tg_arn = module.nlb.python_tg_arn
}

module "cloudwatch" {
  source      = "./modules/cloudwatch"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  node_asg_name   = module.asg_node.asg_name
  python_asg_name = module.asg_python.asg_name
  rds_instance_id = module.rds.db_instance_identifier
}

module "festival" {
  source      = "./modules/festival"
  name_prefix = local.name_prefix
  tags        = local.common_tags

  db_instance_identifier  = module.rds.db_instance_identifier
  db_secret_arn           = module.rds.db_secret_arn
  db_subnet_group_name    = module.rds.db_subnet_group_name
  private_data_subnet_ids = module.vpc.private_data_subnet_ids
  rds_sg_id               = module.security_groups.rds_sg_id
}

module "cloudfront" {
  source      = "./modules/cloudfront"
  name_prefix = local.name_prefix
  domain_name = var.domain_name
  tags        = local.common_tags

  acm_certificate_arn = module.acm.certificate_arn

  frontend_bucket_id             = module.s3.frontend_bucket_id
  frontend_bucket_arn            = module.s3.frontend_bucket_arn
  frontend_bucket_regional_domain = module.s3.frontend_bucket_regional_domain

  media_bucket_id             = module.s3.media_bucket_id
  media_bucket_arn            = module.s3.media_bucket_arn
  media_bucket_regional_domain = module.s3.media_bucket_regional_domain
}
