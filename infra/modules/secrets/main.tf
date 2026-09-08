# Generated secret material. The RDS master password and the two app-level
# tokens are created here and never printed to a human. The database secret
# VERSION (which also needs the RDS endpoint) is written by the rds module to
# avoid a dependency cycle.

resource "random_password" "db" {
  length  = 32
  special = false # keep the password URL-safe for DATABASE_URL
}

resource "random_password" "admin_secret" {
  length  = 40
  special = false
}

resource "random_password" "ingest_api_key" {
  length  = 40
  special = false
}

# ---------------------------------------------------------------------------
# Database secret (container only). Version written by the rds module.
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "database" {
  name                    = var.database_secret_name
  description             = "Postgres connection details + admin secret for the API"
  recovery_window_in_days = 7
  tags                    = var.tags
}

# ---------------------------------------------------------------------------
# App secret. GROQ_API_KEY is left blank for you to fill in the console; the
# ignore_changes below means Terraform will not wipe it on later applies.
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "app" {
  name                    = var.app_secret_name
  description             = "Chatbot secrets (Groq key, ingest key)"
  recovery_window_in_days = 7
  tags                    = var.tags
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    GROQ_API_KEY   = "" # fill in manually after apply, then it is preserved
    INGEST_API_KEY = random_password.ingest_api_key.result
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
