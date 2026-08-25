terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

locals {
  userdata = <<-EOT
    #!/bin/bash
    set -euo pipefail

    dnf update -y

    # Node.js 20 LTS
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs

    npm install -g pm2

    # Redis on-box: 256 MB cap, evict LRU keys when full
    dnf install -y redis
    printf '\nmaxmemory 256mb\nmaxmemory-policy allkeys-lru\n' >> /etc/redis/redis.conf
    systemctl enable --now redis

    # CodeDeploy agent
    dnf install -y ruby wget
    cd /tmp
    wget "https://aws-codedeploy-${var.region}.s3.${var.region}.amazonaws.com/latest/install"
    chmod +x install
    ./install auto
    systemctl enable --now codedeploy-agent

    # App directories -- CodeDeploy deploys here
    mkdir -p /opt/mandapmaps/prod /opt/mandapmaps/dev
    chown -R ec2-user:ec2-user /opt/mandapmaps
  EOT
}

resource "aws_launch_template" "node" {
  name_prefix   = "${var.name_prefix}-lt-node-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = var.node_instance_profile_name
  }

  vpc_security_group_ids = [var.node_sg_id]

  user_data = base64encode(local.userdata)

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 20
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  # IMDSv2 required -- prevents SSRF-based metadata credential theft
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags          = merge(var.tags, { Name = "${var.name_prefix}-node" })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(var.tags, { Name = "${var.name_prefix}-node" })
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_autoscaling_group" "node" {
  name                      = "${var.name_prefix}-asg-node"
  min_size                  = var.min_size
  max_size                  = var.max_size
  desired_capacity          = var.desired_capacity
  vpc_zone_identifier       = var.private_app_subnet_ids
  health_check_type         = "ELB"
  health_check_grace_period = 120

  target_group_arns = [
    var.node_prod_tg_arn,
    var.node_dev_tg_arn,
  ]

  launch_template {
    id      = aws_launch_template.node.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${var.name_prefix}-node"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

resource "aws_codedeploy_app" "node" {
  name             = "${var.name_prefix}-app-node"
  compute_platform = "Server"
}

resource "aws_codedeploy_deployment_group" "prod" {
  app_name               = aws_codedeploy_app.node.name
  deployment_group_name  = "${var.name_prefix}-dg-node-prod"
  service_role_arn       = var.codedeploy_role_arn
  deployment_config_name = "CodeDeployDefault.OneAtATime"

  autoscaling_groups = [aws_autoscaling_group.node.name]

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "IN_PLACE"
  }

  load_balancer_info {
    target_group_info {
      name = var.node_prod_tg_name
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}

resource "aws_codedeploy_deployment_group" "dev" {
  app_name               = aws_codedeploy_app.node.name
  deployment_group_name  = "${var.name_prefix}-dg-node-dev"
  service_role_arn       = var.codedeploy_role_arn
  deployment_config_name = "CodeDeployDefault.AllAtOnce"

  autoscaling_groups = [aws_autoscaling_group.node.name]

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "IN_PLACE"
  }

  load_balancer_info {
    target_group_info {
      name = var.node_dev_tg_name
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
