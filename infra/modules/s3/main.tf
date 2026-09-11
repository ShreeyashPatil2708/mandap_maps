data "aws_caller_identity" "current" {}

# A per-account suffix keeps bucket names globally unique without leaking the
# account id in the human-readable prefix.
locals {
  suffix = substr(sha1(data.aws_caller_identity.current.account_id), 0, 8)

  buckets = {
    frontend = "${var.name}-frontend-${local.suffix}" # SPA, served via CloudFront OAC
    photos   = "${var.name}-photos-${local.suffix}"   # curated responsive WebP variants
    data     = "${var.name}-data-${local.suffix}"     # seed data + FAISS index artifacts
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets
  bucket   = each.value
  tags     = merge(var.tags, { Name = each.value })
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Versioning on the buckets whose contents are curated and worth recovering.
resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.this["photos"].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.this["data"].id
  versioning_configuration {
    status = "Enabled"
  }
}

# Deny non-TLS access. The frontend and photos buckets are intentionally
# excluded here: both are served by CloudFront, so their single allowed bucket
# policy is owned by the cloudfront module, which folds the OAC read grant and
# the same TLS deny into one document (a bucket can only carry one policy).
resource "aws_s3_bucket_policy" "tls_only" {
  for_each = { for k, v in aws_s3_bucket.this : k => v if !contains(["frontend", "photos"], k) }

  bucket = each.value.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [each.value.arn, "${each.value.arn}/*"]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
    ]
  })
}
