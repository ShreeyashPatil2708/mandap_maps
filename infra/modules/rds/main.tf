terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_data_subnet_ids
  tags       = var.tags
}

resource "aws_db_instance" "main" {
  identifier        = "${var.name_prefix}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  multi_az            = false
  publicly_accessible = false
  deletion_protection = false
  skip_final_snapshot = true
  # 7 days of automated backups -> point-in-time recovery. Storage beyond the
  # DB size is negligible at 20GB; the safety net is worth far more.
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  auto_minor_version_upgrade = true

  performance_insights_enabled = false

  tags = var.tags
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${var.name_prefix}/database"
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    PGHOST     = aws_db_instance.main.address
    PGPORT     = "5432"
    PGDATABASE = var.db_name
    PGUSER     = var.db_username
    PGPASSWORD = random_password.db.result
    PGSSL      = "true"
  })
}

# App-level secrets: Groq API key, constructed Postgres URL, and the ingest API
# key for the chatbot. Created once with placeholder values; update via CLI after
# apply (secret_string is ignored below, so real values are set out-of-band):
#   aws secretsmanager put-secret-value \
#     --secret-id mandapmaps-prod/app \
#     --secret-string '{"groq_api_key":"<real-key>","postgres_url":"postgresql://...","ingest_api_key":"<random>"}'
resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name_prefix}/app"
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    groq_api_key   = "REPLACE_ME"
    postgres_url   = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${var.db_name}"
    ingest_api_key = "REPLACE_ME"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
