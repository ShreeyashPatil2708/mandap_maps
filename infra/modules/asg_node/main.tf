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

    # Retry network-bound steps so a transient failure does not abort the whole
    # bootstrap (set -e would otherwise leave the instance half-provisioned).
    retry() {
      for i in 1 2 3 4 5; do
        "$@" && return 0
        echo "retry $i failed for: $*" >&2
        sleep 15
      done
      return 1
    }

    retry dnf update -y

    # Node.js 20 LTS
    retry bash -c "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
    retry dnf install -y nodejs git

    # Redis on-box: 256 MB cap, evict LRU keys when full.
    # AL2023 ships Redis as the redis6 package/service, not redis.
    retry dnf install -y redis6
    printf '\nmaxmemory 256mb\nmaxmemory-policy allkeys-lru\n' >> /etc/redis6/redis6.conf
    systemctl enable --now redis6

    # Clone repo and install the backend workspace. This is an npm-workspaces
    # monorepo, so the single package-lock.json lives at the repo root: npm ci
    # must run there, not in a standalone copy of backend/. The service runs
    # from the repo (WorkingDirectory=repo/backend) and resolves deps from the
    # hoisted repo/node_modules.
    REPO_DIR="/opt/mandapmaps/repo"
    mkdir -p /opt/mandapmaps

    retry git clone https://github.com/ShreeyashPatil2708/mandap_maps.git "$REPO_DIR"
    cd "$REPO_DIR"
    retry npm ci --omit=dev
    chown -R ec2-user:ec2-user /opt/mandapmaps

    # Install and start systemd service
    cp "$REPO_DIR/backend/systemd/mandapmaps-prod.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable --now mandapmaps-prod
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
  name                = "${var.name_prefix}-asg-node"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.private_app_subnet_ids
  health_check_type   = "ELB"
  # Long grace: the instance provisions on boot (dnf update, Node install,
  # npm ci), which takes several minutes. A short grace kills the instance
  # before the service starts, causing an endless replace loop.
  health_check_grace_period = 600

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
