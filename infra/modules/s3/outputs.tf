output "frontend_bucket_id" {
  description = "Frontend S3 bucket name (used as origin ID in CloudFront)"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "Frontend S3 bucket ARN (used in CloudFront OAC bucket policy)"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_regional_domain" {
  description = "Frontend bucket regional domain name (CloudFront origin domain)"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "media_bucket_id" {
  description = "Media S3 bucket name"
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "Media S3 bucket ARN"
  value       = aws_s3_bucket.media.arn
}

output "media_bucket_regional_domain" {
  description = "Media bucket regional domain name (CloudFront origin domain)"
  value       = aws_s3_bucket.media.bucket_regional_domain_name
}

output "faiss_bucket_id" {
  description = "FAISS index S3 bucket name"
  value       = aws_s3_bucket.faiss.id
}

output "codedeploy_bucket_id" {
  description = "CodeDeploy artifacts S3 bucket name"
  value       = aws_s3_bucket.codedeploy.id
}
