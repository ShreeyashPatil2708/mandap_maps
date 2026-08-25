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

    # Python 3.11 + pip
    dnf install -y python3.11 python3.11-pip
    alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
    alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip3.11 1

    # FAISS and FastAPI dependencies
    pip3 install --upgrade pip
    pip3 install fastapi uvicorn[standard] faiss-cpu boto3 numpy

    # CodeDeploy agent
    dnf install -y ruby wget
    cd /tmp
    wget "https://aws-codedeploy-${var.region}.s3.${var.region}.amazonaws.com/latest/install"
    chmod +x install
    ./install auto
    systemctl enable --now codedeploy-agent

    # App and FAISS index directories
    mkdir -p /opt/mandapmaps/python /opt/mandapmaps/faiss
    chown -R ec2-user:ec2-user /opt/mandapmaps

    # Hydrate FAISS index from S3 at boot
    # The running app also refreshes this periodically, but we pre-load on startup
    aws s3 sync s3://${var.faiss_bucket_name}/ /opt/mandapmaps/faiss/ --region ${var.region} || true
  EOT
}

resource "aws_launch_template" "python" {
  name_prefix   = "${var.name_prefix}-lt-python-"
  image_id      = data.aws_ami.al2023.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = var.python_instance_profile_name
  }

  vpc_security_group_ids = [var.python_sg_id]

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
    tags          = merge(var.tags, { Name = "${var.name_prefix}-python" })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(var.tags, { Name = "${var.name_prefix}-python" })
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_autoscaling_group" "python" {
  name                      = "${var.name_prefix}-asg-python"
  min_size                  = var.min_size
  max_size                  = var.max_size
  desired_capacity          = var.desired_capacity
  vpc_zone_identifier       = var.private_app_subnet_ids
  health_check_type         = "ELB"
  health_check_grace_period = 180

  target_group_arns = [var.python_tg_arn]

  launch_template {
    id      = aws_launch_template.python.id
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
    value               = "${var.name_prefix}-python"
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

resource "aws_codedeploy_app" "python" {
  name             = "${var.name_prefix}-app-python"
  compute_platform = "Server"
}

resource "aws_codedeploy_deployment_group" "python" {
  app_name               = aws_codedeploy_app.python.name
  deployment_group_name  = "${var.name_prefix}-dg-python"
  service_role_arn       = var.codedeploy_role_arn
  deployment_config_name = "CodeDeployDefault.OneAtATime"

  autoscaling_groups = [aws_autoscaling_group.python.name]

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "IN_PLACE"
  }

  load_balancer_info {
    target_group_info {
      name = var.python_tg_name
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
}
