output "db_secret_arn" {
  description = "Secrets Manager ARN for DB connection details -- set as GH Actions secret DB_SECRET_ARN; apps call GetSecretValue at startup"
  value       = aws_secretsmanager_secret.db.arn
}

output "db_secret_name" {
  description = "Secrets Manager secret name for DB connection details"
  value       = aws_secretsmanager_secret.db.name
}

output "db_endpoint" {
  description = "RDS endpoint hostname"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "db_instance_identifier" {
  description = "RDS instance identifier -- used by CloudWatch and festival module"
  value       = aws_db_instance.main.identifier
}

output "db_subnet_group_name" {
  description = "RDS subnet group name -- used by festival module for proxy"
  value       = aws_db_subnet_group.main.name
}

output "app_secret_arn" {
  description = "Secrets Manager ARN for app-level secrets (Groq key, chatbot Postgres URL)"
  value       = aws_secretsmanager_secret.app.arn
}

output "app_secret_name" {
  description = "Secrets Manager secret name for app-level secrets"
  value       = aws_secretsmanager_secret.app.name
}
