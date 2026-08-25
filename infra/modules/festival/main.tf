terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# --- IAM role for RDS Proxy ---
# Proxy needs to read the DB secret from Secrets Manager for IAM auth.

resource "aws_iam_role" "rds_proxy" {
  name = "${var.name_prefix}-role-rds-proxy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "rds_proxy_secrets" {
  name = "secrets-access"
  role = aws_iam_role.rds_proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = var.db_secret_arn
    }]
  })
}

# --- IAM role for Lambda ---

resource "aws_iam_role" "festival_lambda" {
  name = "${var.name_prefix}-role-festival-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "festival_lambda" {
  name = "festival-permissions"
  role = aws_iam_role.festival_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "RDSProxy"
        Effect = "Allow"
        Action = [
          "rds:CreateDBProxy",
          "rds:DeleteDBProxy",
          "rds:DescribeDBProxies",
          "rds:RegisterDBProxyTargets",
          "rds:DeregisterDBProxyTargets",
          "rds:DescribeDBProxyTargets",
          "rds:DescribeDBProxyTargetGroups",
        ]
        Resource = "*"
      },
      {
        Sid      = "PassProxyRole"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = aws_iam_role.rds_proxy.arn
      },
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name_prefix}-festival:*"
      },
    ]
  })
}

# --- Lambda function ---

data "archive_file" "festival" {
  type        = "zip"
  output_path = "${path.module}/festival_lambda.zip"

  source {
    filename = "handler.py"
    content  = <<-PYTHON
      import boto3
      import os
      import logging

      logger = logging.getLogger()
      logger.setLevel(logging.INFO)

      def handler(event, context):
          action = event.get("action", "enable")
          rds = boto3.client("rds", region_name=os.environ["AWS_REGION"])

          proxy_name  = os.environ["PROXY_NAME"]
          secret_arn  = os.environ["DB_SECRET_ARN"]
          role_arn    = os.environ["PROXY_ROLE_ARN"]
          subnet_ids  = os.environ["SUBNET_IDS"].split(",")
          sg_ids      = os.environ["SECURITY_GROUP_IDS"].split(",")
          db_id       = os.environ["DB_INSTANCE_IDENTIFIER"]

          if action == "enable":
              logger.info("Creating RDS Proxy %s", proxy_name)
              rds.create_db_proxy(
                  DBProxyName=proxy_name,
                  EngineFamily="POSTGRESQL",
                  Auth=[{
                      "AuthScheme": "SECRETS",
                      "SecretArn": secret_arn,
                      "IAMAuth": "DISABLED",
                  }],
                  RoleArn=role_arn,
                  VpcSubnetIds=subnet_ids,
                  VpcSecurityGroupIds=sg_ids,
                  RequireTLS=True,
                  Tags=[{"Key": "ManagedBy", "Value": "festival-lambda"}],
              )
              waiter = rds.get_waiter("db_proxy_available")
              waiter.wait(DBProxyName=proxy_name)
              rds.register_db_proxy_targets(
                  DBProxyName=proxy_name,
                  DBInstanceIdentifiers=[db_id],
              )
              logger.info("RDS Proxy %s is available and target registered", proxy_name)

          elif action == "disable":
              logger.info("Deleting RDS Proxy %s", proxy_name)
              try:
                  rds.deregister_db_proxy_targets(
                      DBProxyName=proxy_name,
                      DBInstanceIdentifiers=[db_id],
                  )
              except Exception:
                  pass
              try:
                  rds.delete_db_proxy(DBProxyName=proxy_name)
                  logger.info("RDS Proxy %s deleted", proxy_name)
              except rds.exceptions.DBProxyNotFoundFault:
                  logger.info("RDS Proxy %s not found -- already deleted", proxy_name)

          return {"action": action, "proxy": proxy_name}
    PYTHON
  }
}

resource "aws_lambda_function" "festival" {
  function_name    = "${var.name_prefix}-festival"
  description      = "Enables/disables RDS Proxy around Ganesh Chaturthi festival window"
  role             = aws_iam_role.festival_lambda.arn
  runtime          = "python3.11"
  handler          = "handler.handler"
  filename         = data.archive_file.festival.output_path
  source_code_hash = data.archive_file.festival.output_base64sha256
  timeout          = 900

  environment {
    variables = {
      PROXY_NAME             = "${var.name_prefix}-rds-proxy"
      DB_SECRET_ARN          = var.db_secret_arn
      PROXY_ROLE_ARN         = aws_iam_role.rds_proxy.arn
      DB_INSTANCE_IDENTIFIER = var.db_instance_identifier
      SUBNET_IDS             = join(",", var.private_data_subnet_ids)
      SECURITY_GROUP_IDS     = var.rds_sg_id
    }
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "festival_lambda" {
  name              = "/aws/lambda/${var.name_prefix}-festival"
  retention_in_days = 7
  tags              = var.tags
}

# --- EventBridge schedules ---
# Enable proxy: Sep 12 18:30 UTC = Sep 13 00:00 IST (one day before Chaturthi)
# Disable proxy: Sep 18 18:30 UTC = Sep 19 00:00 IST (5 days after)

resource "aws_cloudwatch_event_rule" "enable_proxy" {
  name                = "${var.name_prefix}-festival-enable"
  description         = "Enable RDS Proxy before Ganesh Chaturthi (Sep 13 IST)"
  schedule_expression = "cron(30 18 12 9 ? *)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_rule" "disable_proxy" {
  name                = "${var.name_prefix}-festival-disable"
  description         = "Disable RDS Proxy after Ganesh Chaturthi window (Sep 19 IST)"
  schedule_expression = "cron(30 18 18 9 ? *)"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "enable_proxy" {
  rule  = aws_cloudwatch_event_rule.enable_proxy.name
  arn   = aws_lambda_function.festival.arn
  input = jsonencode({ action = "enable" })
}

resource "aws_cloudwatch_event_target" "disable_proxy" {
  rule  = aws_cloudwatch_event_rule.disable_proxy.name
  arn   = aws_lambda_function.festival.arn
  input = jsonencode({ action = "disable" })
}

resource "aws_lambda_permission" "allow_enable_eventbridge" {
  statement_id  = "AllowEnableEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.festival.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.enable_proxy.arn
}

resource "aws_lambda_permission" "allow_disable_eventbridge" {
  statement_id  = "AllowDisableEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.festival.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.disable_proxy.arn
}
