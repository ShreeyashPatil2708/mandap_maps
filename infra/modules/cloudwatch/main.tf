terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

# --- Log groups ---

resource "aws_cloudwatch_log_group" "node_app" {
  name              = "/mandapmaps/node/app"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "python_app" {
  name              = "/mandapmaps/python/app"
  retention_in_days = 14
  tags              = var.tags
}

# --- CPU alarms ---

resource "aws_cloudwatch_metric_alarm" "node_cpu_high" {
  alarm_name          = "${var.name_prefix}-node-cpu-high"
  alarm_description   = "Node.js ASG CPU has been above 80% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    AutoScalingGroupName = var.node_asg_name
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "python_cpu_high" {
  alarm_name          = "${var.name_prefix}-python-cpu-high"
  alarm_description   = "Python ASG CPU has been above 80% for 10 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    AutoScalingGroupName = var.python_asg_name
  }

  tags = var.tags
}

# --- RDS connection alarm ---
# db.t3.micro max_connections ~100 (Postgres formula: LEAST(DBInstanceClassMemory/9531392, 5000)).
# Alert at 80 to leave headroom before the RDS Proxy festival module kicks in.

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.name_prefix}-rds-connections-high"
  alarm_description   = "RDS connection count is approaching the instance limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  tags = var.tags
}

# --- Error rate metric filter on Node logs ---

resource "aws_cloudwatch_log_metric_filter" "node_errors" {
  name           = "${var.name_prefix}-node-errors"
  log_group_name = aws_cloudwatch_log_group.node_app.name
  pattern        = "ERROR"

  metric_transformation {
    name      = "NodeErrorCount"
    namespace = "MandapMaps"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "node_error_rate" {
  alarm_name          = "${var.name_prefix}-node-error-spike"
  alarm_description   = "More than 10 ERROR log lines in 5 minutes on Node.js"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "NodeErrorCount"
  namespace           = "MandapMaps"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"

  tags = var.tags
}
