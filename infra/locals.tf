locals {
  name_prefix = "mandapmaps-${var.environment}"

  common_tags = {
    Project     = "mandapmaps"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  # S3 bucket names -- account ID suffix guarantees global uniqueness.
  frontend_bucket_name   = "${local.name_prefix}-frontend-${data.aws_caller_identity.current.account_id}"
  media_bucket_name      = "${local.name_prefix}-media-${data.aws_caller_identity.current.account_id}"
  faiss_bucket_name      = "${local.name_prefix}-faiss-${data.aws_caller_identity.current.account_id}"
  codedeploy_bucket_name = "${local.name_prefix}-codedeploy-${data.aws_caller_identity.current.account_id}"
}
