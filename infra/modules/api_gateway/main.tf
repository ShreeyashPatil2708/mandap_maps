terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.name_prefix}"
  retention_in_days = 7
  tags              = var.tags
}

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.name_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Requested-With"]
    max_age       = 300
  }

  tags = var.tags
}

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.name_prefix}-vpc-link"
  security_group_ids = [var.nlb_sg_id]
  subnet_ids         = var.private_app_subnet_ids

  tags = var.tags
}

resource "aws_apigatewayv2_integration" "node" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = var.node_prod_listener_arn
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id
}

resource "aws_apigatewayv2_integration" "python" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = var.python_listener_arn
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id
}

# The Python chatbot serves its routes under /api/chat (see chatbot/app/api/chat.py
# and the Vite dev proxy in frontend/vite.config.js). More specific routes win in
# HTTP APIs, so /api/chat and /api/chat/{proxy+} go to Python while every other
# /api/* path falls through to Node.
resource "aws_apigatewayv2_route" "node" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.node.id}"
}

resource "aws_apigatewayv2_route" "python_chat" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/chat"
  target    = "integrations/${aws_apigatewayv2_integration.python.id}"
}

resource "aws_apigatewayv2_route" "python_chat_proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /api/chat/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.python.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  # Edge backstop against abuse/cost spikes, independent of the app-layer limiter.
  # Applies to every route; burst is the token-bucket ceiling, rate the steady state.
  default_route_settings {
    throttling_burst_limit = 200
    throttling_rate_limit  = 100
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = var.tags
}
