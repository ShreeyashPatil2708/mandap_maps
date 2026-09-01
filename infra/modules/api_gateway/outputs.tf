output "api_endpoint" {
  description = "API Gateway invoke URL -- set as GH Actions secret API_GATEWAY_URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_id" {
  description = "API Gateway HTTP API ID"
  value       = aws_apigatewayv2_api.main.id
}

output "api_domain" {
  description = "API Gateway domain name (host only, no scheme) -- CloudFront origin for /api/*"
  value       = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}
