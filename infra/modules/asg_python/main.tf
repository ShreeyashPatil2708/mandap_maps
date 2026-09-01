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

    # Python 3.11 + pip + git
    retry dnf install -y python3.11 python3.11-pip git
    alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
    alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip3.11 1

    export PIP_DEFAULT_TIMEOUT=120
    retry pip3 install --upgrade pip

    # Switching the python3 alternative to 3.11 (below/above) breaks the system
    # aws CLI, whose awscli module lives under the 3.9 site-packages. Reinstall
    # awscli into 3.11 (lands at /usr/local/bin/aws, ahead of /usr/bin/aws on
    # PATH) so the FAISS s3 sync and the chatbot's run.sh secret fetch work.
    retry pip3 install awscli

    # Clone repo and set up chatbot
    REPO_DIR="/opt/mandapmaps/repo"
    APP_DIR="/opt/mandapmaps/python"
    mkdir -p "$APP_DIR" /opt/mandapmaps/faiss

    retry git clone https://github.com/ShreeyashPatil2708/mandap_maps.git "$REPO_DIR"
    rsync -a "$REPO_DIR/chatbot/" "$APP_DIR/"
    chown -R ec2-user:ec2-user /opt/mandapmaps

    # sentence-transformers pulls torch, whose default PyPI wheel is the ~500MB
    # CUDA build and repeatedly fails to download over NAT. Install the smaller
    # CPU-only wheel first so the requirements install finds it already satisfied.
    pip3 install --retries 10 --timeout 120 torch --index-url https://download.pytorch.org/whl/cpu
    pip3 install --retries 10 --timeout 120 -r "$APP_DIR/requirements.txt"

    # Hydrate FAISS index from S3 at boot
    aws s3 sync s3://${var.faiss_bucket_name}/ /opt/mandapmaps/faiss/ --region ${var.region} || true

    # Install and start systemd service
    cp "$REPO_DIR/chatbot/systemd/mandapmaps-chatbot.service" /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable --now mandapmaps-chatbot
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
  name                = "${var.name_prefix}-asg-python"
  min_size            = var.min_size
  max_size            = var.max_size
  desired_capacity    = var.desired_capacity
  vpc_zone_identifier = var.private_app_subnet_ids
  health_check_type   = "ELB"
  # Long grace: the instance provisions on boot (dnf update, torch CPU wheel,
  # sentence-transformers, faiss, psycopg2 build), which takes many minutes. A
  # short grace kills the instance before the service starts, causing an endless
  # replace loop.
  health_check_grace_period = 900

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
