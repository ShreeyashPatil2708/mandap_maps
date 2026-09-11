# ---------------------------------------------------------------------------
# Regional ACM certificate for the origin hostname.
#
# Cloudflare connects to the ALB over HTTPS (use Full or Full-strict). This
# cert is DNS-validated: after `terraform apply` starts, add the CNAME records
# from the `acm_validation_records` output to Cloudflare (DNS-only). Apply
# pauses on aws_acm_certificate_validation until the cert is ISSUED, then
# continues. This is a one-time step.
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "origin" {
  domain_name       = var.origin_host
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_acm_certificate_validation" "origin" {
  certificate_arn = aws_acm_certificate.origin.arn
}

# ---------------------------------------------------------------------------
# ALB
# ---------------------------------------------------------------------------
resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  drop_invalid_header_fields = true
  enable_http2               = true

  tags = var.tags
}

resource "aws_lb_target_group" "api" {
  name        = "${var.name}-api-tg"
  port        = var.api_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Give in-flight requests a few seconds to finish before an instance drains.
  deregistration_delay = 15

  tags = var.tags
}

resource "aws_lb_target_group" "chatbot" {
  name        = "${var.name}-chatbot-tg"
  port        = var.chatbot_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 15

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Listeners
# ---------------------------------------------------------------------------
# HTTP -> HTTPS redirect (Cloudflare should always use HTTPS to origin, but
# this covers any stray HTTP and keeps the origin HTTPS-only.)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      protocol    = "HTTPS"
      port        = "443"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.origin.certificate_arn

  # Default: reject anything that does not match a rule below (including any
  # request missing the shared secret header). This is what makes a leaked ALB
  # DNS name useless without going through Cloudflare.
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}

# Chatbot: /api/chat and /api/chat/* AND the shared secret header.
resource "aws_lb_listener_rule" "chatbot" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.chatbot.arn
  }

  condition {
    path_pattern {
      values = ["/api/chat", "/api/chat/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "x-origin-secret"
      values           = [var.origin_shared_secret]
    }
  }
}

# Everything else under /api/* AND the shared secret header -> API fleet.
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  condition {
    http_header {
      http_header_name = "x-origin-secret"
      values           = [var.origin_shared_secret]
    }
  }
}
