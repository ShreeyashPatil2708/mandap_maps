data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# --- GitHub Actions OIDC ---

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # AWS validates the thumbprint internally for known providers; these values
  # are required by Terraform but not actually checked by AWS for this provider.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = var.tags
}

resource "aws_iam_role" "github_actions" {
  name = "${var.name_prefix}-role-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      # This org has GitHub's custom OIDC subject claim enabled, so sub is
      # ID-based: repo:owner@<owner_id>/repo@<repo_id>:ref:refs/heads/master,
      # not the default repo:owner/repo:... form. AWS requires the trust to
      # condition on sub (or job_workflow_ref), so we match that ID-based
      # subject via var.github_oidc_sub. repository and ref are standard claims
      # unaffected by the customization and pin the exact repo and branch.
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud"        = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:repository" = var.github_repo
          "token.actions.githubusercontent.com:ref"        = "refs/heads/master"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = var.github_oidc_sub
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "github_actions_cd" {
  name = "cd-permissions"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMSendCommand"
        Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = [
          "arn:aws:ssm:${data.aws_region.current.name}::document/AWS-RunShellScript",
          "arn:aws:ec2:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:instance/*",
        ]
      },
      {
        Sid      = "SSMWaitAndCheck"
        Effect   = "Allow"
        Action   = ["ssm:ListCommandInvocations", "ssm:GetCommandInvocation"]
        Resource = "*"
      },
      {
        Sid    = "FrontendSync"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.frontend_bucket_name}",
          "arn:aws:s3:::${var.frontend_bucket_name}/*",
        ]
      },
      {
        Sid      = "CloudFrontInvalidation"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
      },
    ]
  })
}

# --- Node.js EC2 role ---

resource "aws_iam_role" "node_ec2" {
  name = "${var.name_prefix}-role-node-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_instance_profile" "node_ec2" {
  name = "${var.name_prefix}-profile-node-ec2"
  role = aws_iam_role.node_ec2.name
}

# Covers SSM Session Manager, Run Command, and Patch Manager.
resource "aws_iam_role_policy_attachment" "node_ssm" {
  role       = aws_iam_role.node_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Covers CloudWatch agent log streaming.
resource "aws_iam_role_policy_attachment" "node_cloudwatch" {
  role       = aws_iam_role.node_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "node_custom" {
  name = "node-ec2-custom"
  role = aws_iam_role.node_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        # Scoped to secrets with this project prefix -- RDS creds, JWT secret.
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.name_prefix}-*"
      },
      {
        Sid    = "CodeDeployArtifactsDownload"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.codedeploy_bucket_name}",
          "arn:aws:s3:::${var.codedeploy_bucket_name}/*",
        ]
      },
    ]
  })
}

# --- Python EC2 role ---

resource "aws_iam_role" "python_ec2" {
  name = "${var.name_prefix}-role-python-ec2"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_instance_profile" "python_ec2" {
  name = "${var.name_prefix}-profile-python-ec2"
  role = aws_iam_role.python_ec2.name
}

resource "aws_iam_role_policy_attachment" "python_ssm" {
  role       = aws_iam_role.python_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "python_cloudwatch" {
  role       = aws_iam_role.python_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "python_custom" {
  name = "python-ec2-custom"
  role = aws_iam_role.python_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:secret:${var.name_prefix}-*"
      },
      {
        # Read on boot (hydrate index), write after rebuild (push updated index).
        Sid    = "FAISSIndexReadWrite"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.faiss_bucket_name}",
          "arn:aws:s3:::${var.faiss_bucket_name}/*",
        ]
      },
      {
        Sid    = "CodeDeployArtifactsDownload"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.codedeploy_bucket_name}",
          "arn:aws:s3:::${var.codedeploy_bucket_name}/*",
        ]
      },
    ]
  })
}

# --- CodeDeploy service role ---

resource "aws_iam_role" "codedeploy" {
  name = "${var.name_prefix}-role-codedeploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

# Grants CodeDeploy permission to read EC2 tags, interact with ASGs,
# publish SNS notifications, and write CloudWatch metrics.
resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole"
}
