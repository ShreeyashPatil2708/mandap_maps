output "state_bucket" {
  description = "Name of the S3 bucket holding remote state. Put this in infra/backend.tf."
  value       = aws_s3_bucket.state.id
}

output "lock_table" {
  description = "Name of the DynamoDB lock table. Put this in infra/backend.tf."
  value       = aws_dynamodb_table.lock.name
}
