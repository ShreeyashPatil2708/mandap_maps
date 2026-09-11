output "frontend_bucket_id" {
  value = aws_s3_bucket.this["frontend"].id
}

output "frontend_bucket_arn" {
  value = aws_s3_bucket.this["frontend"].arn
}

output "frontend_bucket_regional_domain_name" {
  value = aws_s3_bucket.this["frontend"].bucket_regional_domain_name
}

output "photos_bucket_id" {
  value = aws_s3_bucket.this["photos"].id
}

output "photos_bucket_arn" {
  value = aws_s3_bucket.this["photos"].arn
}

output "photos_bucket_regional_domain_name" {
  value = aws_s3_bucket.this["photos"].bucket_regional_domain_name
}

output "data_bucket_id" {
  value = aws_s3_bucket.this["data"].id
}

output "data_bucket_arn" {
  value = aws_s3_bucket.this["data"].arn
}
