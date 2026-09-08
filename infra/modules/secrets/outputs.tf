output "database_secret_id" {
  value = aws_secretsmanager_secret.database.id
}

output "database_secret_arn" {
  value = aws_secretsmanager_secret.database.arn
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}

output "admin_secret" {
  value     = random_password.admin_secret.result
  sensitive = true
}
