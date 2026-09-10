resource "aws_launch_template" "this" {
  name_prefix   = "${var.name}-"
  image_id      = var.ami_id
  instance_type = var.instance_types[0]
  key_name      = var.key_name != "" ? var.key_name : null

  iam_instance_profile {
    name = var.instance_profile_name
  }

  # Public IP so instances reach the internet directly via the IGW (no NAT box).
  # Inbound stays closed by the app security group (ALB-only). Security groups
  # live in the NIC block because a launch template cannot set both a top-level
  # vpc_security_group_ids and a network_interfaces block.
  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [var.security_group_id]
    delete_on_termination       = true
  }

  user_data = base64encode(var.user_data)

  # IMDSv2 required: blocks the classic SSRF-to-credentials path.
  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = var.detailed_monitoring
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags          = merge(var.tags, { Name = var.name, Role = var.role })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(var.tags, { Name = var.name })
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "this" {
  name                      = "${var.name}-asg"
  min_size                  = var.min_size
  max_size                  = var.max_size
  desired_capacity          = var.desired_capacity
  vpc_zone_identifier       = var.subnet_ids
  target_group_arns         = var.target_group_arns
  health_check_type         = "ELB"
  health_check_grace_period = var.health_check_grace_period
  capacity_rebalance        = var.capacity_type == "spot"

  mixed_instances_policy {
    instances_distribution {
      # on-demand: 100% on-demand above base. spot: 100% spot.
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = var.capacity_type == "on-demand" ? 100 : 0
      # lowest-price walks the type pool until it finds one with capacity, so a
      # single constrained type/AZ no longer fails the whole launch.
      on_demand_allocation_strategy = "lowest-price"
      spot_allocation_strategy      = "price-capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.this.id
        version            = "$Latest"
      }

      dynamic "override" {
        for_each = var.instance_types
        content {
          instance_type = override.value
        }
      }
    }
  }

  # Roll instances when the launch template changes (new AMI, new user-data).
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = var.min_size > 0 ? 90 : 0
    }
  }

  dynamic "tag" {
    for_each = merge(var.tags, { Name = var.name, Role = var.role })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    # desired_capacity drifts as scaling policies act; do not fight them on apply.
    ignore_changes = [desired_capacity]
  }
}

# ---------------------------------------------------------------------------
# Optional scaling policies
# ---------------------------------------------------------------------------
resource "aws_autoscaling_policy" "cpu" {
  count                  = var.cpu_target > 0 ? 1 : 0
  name                   = "${var.name}-cpu-track"
  autoscaling_group_name = aws_autoscaling_group.this.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target
  }
}

resource "aws_autoscaling_policy" "alb_requests" {
  count                  = var.alb_request_target > 0 ? 1 : 0
  name                   = "${var.name}-alb-req-track"
  autoscaling_group_name = aws_autoscaling_group.this.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = var.alb_resource_label
    }
    target_value = var.alb_request_target
  }
}

# ---------------------------------------------------------------------------
# Scheduled scaling (festival windows)
# ---------------------------------------------------------------------------
resource "aws_autoscaling_schedule" "this" {
  for_each = var.scheduled_actions

  scheduled_action_name  = each.key
  autoscaling_group_name = aws_autoscaling_group.this.name
  recurrence             = each.value.recurrence
  min_size               = each.value.min_size
  max_size               = each.value.max_size
  desired_capacity       = each.value.desired_capacity
  time_zone              = "Asia/Kolkata"
}
