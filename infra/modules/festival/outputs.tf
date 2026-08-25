output "lambda_function_name" {
  description = "Festival Lambda function name -- invoke manually to test enable/disable"
  value       = aws_lambda_function.festival.function_name
}
