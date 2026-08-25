locals {
  buckets = {
    frontend   = var.frontend_bucket_name
    media      = var.media_bucket_name
    faiss      = var.faiss_bucket_name
    codedeploy = var.codedeploy_bucket_name
  }
}

# --- Buckets ---

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
  tags   = { Name = var.frontend_bucket_name }
}

resource "aws_s3_bucket" "media" {
  bucket = var.media_bucket_name
  tags   = { Name = var.media_bucket_name }
}

resource "aws_s3_bucket" "faiss" {
  bucket = var.faiss_bucket_name
  tags   = { Name = var.faiss_bucket_name }
}

resource "aws_s3_bucket" "codedeploy" {
  bucket = var.codedeploy_bucket_name
  tags   = { Name = var.codedeploy_bucket_name }
}

# --- Disable ACLs on all buckets (bucket owner enforced -- modern default) ---

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_ownership_controls" "faiss" {
  bucket = aws_s3_bucket.faiss.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_ownership_controls" "codedeploy" {
  bucket = aws_s3_bucket.codedeploy.id
  rule { object_ownership = "BucketOwnerEnforced" }
}

# --- Block all public access on every bucket ---

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "faiss" {
  bucket                  = aws_s3_bucket.faiss.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "codedeploy" {
  bucket                  = aws_s3_bucket.codedeploy.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- Encryption (AES256) on all buckets ---

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "faiss" {
  bucket = aws_s3_bucket.faiss.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "codedeploy" {
  bucket = aws_s3_bucket.codedeploy.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
    bucket_key_enabled = true
  }
}

# --- Versioning ---
# Frontend: on -- each deploy syncs new files, versioning enables rollback.
# Media, FAISS, CodeDeploy: off -- photos are large/immutable once uploaded,
# FAISS index is fully replaced on rebuild, CodeDeploy bundles have lifecycle expiry.

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration { status = "Enabled" }
}

# --- CodeDeploy bundle expiry ---
# Bundles are only needed until the deployment they represent is superseded.
# 30 days covers any realistic rollback window.

resource "aws_s3_bucket_lifecycle_configuration" "codedeploy" {
  bucket = aws_s3_bucket.codedeploy.id

  rule {
    id     = "expire-old-bundles"
    status = "Enabled"

    filter { prefix = "" }

    expiration { days = 30 }
  }
}
