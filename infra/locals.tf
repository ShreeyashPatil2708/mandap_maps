data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = var.project

  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)

  common_tags = {
    Project   = var.project
    ManagedBy = "terraform"
  }

  # App containers read secrets by these ids (see backend/src/config/secrets.js
  # and chatbot/scripts/run.sh). Kept here so every module agrees on the names.
  db_secret_name  = "${var.project}/database"
  app_secret_name = "${var.project}/app"

  # CloudWatch log group for app/system logs. Used as a plain string by the
  # instance user-data (the CloudWatch agent creates it if missing), and given
  # a retention policy by the monitoring module. Kept as a local to avoid a
  # module dependency cycle between the asg and monitoring modules.
  log_group_name = "/${var.project}/app"

  api_port     = 3000
  chatbot_port = 8000

  # Node reads a comma-separated list; the chatbot's pydantic list[str] field
  # parses its env value as JSON, so it needs a JSON array string.
  cors_origins         = "https://${var.domain_name},https://www.${var.domain_name}"
  allowed_origins_json = jsonencode(["https://${var.domain_name}", "https://www.${var.domain_name}"])
}
