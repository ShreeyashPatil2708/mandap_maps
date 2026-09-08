output "alb_dns_name" {
  description = "ALB DNS name. Create a DNS-only (grey-cloud) Cloudflare record for origin_host pointing here."
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  value = aws_lb.this.zone_id
}

output "api_target_group_arn" {
  value = aws_lb_target_group.api.arn
}

output "chatbot_target_group_arn" {
  value = aws_lb_target_group.chatbot.arn
}

output "alb_arn_suffix" {
  value = aws_lb.this.arn_suffix
}

output "api_tg_arn_suffix" {
  value = aws_lb_target_group.api.arn_suffix
}

output "chatbot_tg_arn_suffix" {
  value = aws_lb_target_group.chatbot.arn_suffix
}

# Resource label for the ALBRequestCountPerTarget scaling metric.
output "api_resource_label" {
  value = "${aws_lb.this.arn_suffix}/${aws_lb_target_group.api.arn_suffix}"
}

output "acm_validation_records" {
  description = "Add these as DNS-only CNAME records in Cloudflare to validate the origin ACM cert. Apply pauses until you do."
  value = [
    for o in aws_acm_certificate.origin.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}
