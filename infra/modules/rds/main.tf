resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnet-group"
  subnet_ids = var.data_subnet_ids
  tags       = merge(var.tags, { Name = "${var.name}-db-subnet-group" })
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name}-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  allocated_storage = var.allocated_storage
  # Storage autoscaling disabled to stay within the 20 GB Free plan limit. Set a
  # higher ceiling (e.g. var.allocated_storage * 2) after upgrading to paid.
  max_allocated_storage = var.allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.rds_sg_id]
  multi_az               = var.multi_az
  publicly_accessible    = false

  # The AWS Free plan caps automated-backup retention. 1 day keeps point-in-time
  # recovery on while staying inside the free limit; bump back to 7 after the
  # account is upgraded to a paid plan.
  backup_retention_period = 1
  backup_window           = "18:30-19:00" # off-peak UTC (midnight IST)
  maintenance_window      = "sun:19:30-sun:20:30"
  copy_tags_to_snapshot   = true

  # Do not lose the data to a typo. A final snapshot is taken on destroy.
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-db-final"

  auto_minor_version_upgrade = true
  # Performance Insights is not covered by the Free plan; re-enable after upgrade.
  performance_insights_enabled = false

  tags = merge(var.tags, { Name = "${var.name}-db" })
}

# Now that the endpoint exists, write the full database secret so the app fleet
# can pull connection details at boot.
resource "aws_secretsmanager_secret_version" "database" {
  secret_id = var.database_secret_id
  secret_string = jsonencode({
    PGHOST       = aws_db_instance.this.address
    PGPORT       = tostring(aws_db_instance.this.port)
    PGDATABASE   = var.db_name
    PGUSER       = var.db_username
    PGPASSWORD   = var.db_password
    PGSSL        = "true"
    DATABASE_URL = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?sslmode=require"
    ADMIN_SECRET = var.admin_secret
  })
}
