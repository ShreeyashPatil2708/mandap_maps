# Bootstrap for the remote Terraform state backend.
#
# Apply this ONCE, before the root stack, with LOCAL state (there is no
# backend block here on purpose). It creates the S3 bucket that stores the
# root stack state and the DynamoDB table that provides state locking, so the
# rest of the infrastructure can use a safe, shared, versioned backend.
#
# After apply, copy the outputs into infra/backend.tf (already prefilled with
# the default names below) and run `terraform init` in infra/.

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Component = "tf-state-backend"
    }
  }
}

# Account ID is appended to the bucket name so it is globally unique and can
# never collide with a state bucket left behind in another AWS account.
data "aws_caller_identity" "current" {}

# S3 bucket that holds the remote state file.
resource "aws_s3_bucket" "state" {
  bucket = "${var.project}-tfstate-${var.region}-${data.aws_caller_identity.current.account_id}"

  # Guard rail: the state bucket should outlive any single apply. Destroying it
  # would orphan the state of every other stack, so block accidental deletion.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Deny any non-TLS access to the state bucket.
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.state.arn,
          "${aws_s3_bucket.state.arn}/*",
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
    ]
  })
}

# DynamoDB table used by Terraform for state locking.
resource "aws_dynamodb_table" "lock" {
  name         = "${var.project}-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }
}
