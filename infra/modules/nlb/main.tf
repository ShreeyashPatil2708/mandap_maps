terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

resource "aws_lb" "main" {
  name               = "${var.name_prefix}-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_app_subnet_ids
  security_groups    = [var.nlb_sg_id]

  # The NLB spans both app-subnet AZs, but the ASG often runs a single instance
  # (off-season min = 1) that lives in just one AZ. NLB cross-zone is OFF by
  # default, so the node in the empty AZ black-holes requests -> ~10s timeout ->
  # API Gateway 503. Enabling cross-zone lets every NLB node reach the target.
  enable_cross_zone_load_balancing = true

  enable_deletion_protection = false

  tags = var.tags
}

resource "aws_lb_target_group" "node_prod" {
  name        = "${var.name_prefix}-tg-node-prod"
  port        = 3000
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 6
  }

  tags = var.tags
}

resource "aws_lb_target_group" "node_dev" {
  name        = "${var.name_prefix}-tg-node-dev"
  port        = 3001
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 6
  }

  tags = var.tags
}

resource "aws_lb_target_group" "python" {
  name        = "${var.name_prefix}-tg-python"
  port        = 8000
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 6
  }

  tags = var.tags
}

resource "aws_lb_listener" "node_prod" {
  load_balancer_arn = aws_lb.main.arn
  port              = 3000
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.node_prod.arn
  }

  tags = var.tags
}

resource "aws_lb_listener" "node_dev" {
  load_balancer_arn = aws_lb.main.arn
  port              = 3001
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.node_dev.arn
  }

  tags = var.tags
}

resource "aws_lb_listener" "python" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8000
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.python.arn
  }

  tags = var.tags
}
