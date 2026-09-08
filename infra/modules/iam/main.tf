data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# App fleet instance role (API + chatbot).
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.name}-app-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = var.tags
}

# SSM Session Manager + Run Command (used by deploys and break-glass access).
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# CloudWatch agent (custom metrics + log push).
resource "aws_iam_role_policy_attachment" "app_cw_agent" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Read only the two app secrets, nothing else in Secrets Manager.
data "aws_iam_policy_document" "app_secrets" {
  statement {
    sid       = "ReadAppSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = var.secret_arns
  }
}

resource "aws_iam_role_policy" "app_secrets" {
  name   = "${var.name}-app-secrets"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_secrets.json
}

# Read only the specified buckets (data/FAISS and photos), objects only.
data "aws_iam_policy_document" "app_s3" {
  statement {
    sid       = "ListReadableBuckets"
    actions   = ["s3:ListBucket"]
    resources = var.readable_bucket_arns
  }
  statement {
    sid       = "GetReadableObjects"
    actions   = ["s3:GetObject"]
    resources = [for arn in var.readable_bucket_arns : "${arn}/*"]
  }
}

resource "aws_iam_role_policy" "app_s3" {
  name   = "${var.name}-app-s3-read"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app_s3.json
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.name}-app-profile"
  role = aws_iam_role.app.name
  tags = var.tags
}

# ---------------------------------------------------------------------------
# NAT instance role (SSM only, so it needs no key pair).
# ---------------------------------------------------------------------------
resource "aws_iam_role" "nat" {
  name               = "${var.name}-nat-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "nat_ssm" {
  role       = aws_iam_role.nat.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "nat" {
  name = "${var.name}-nat-profile"
  role = aws_iam_role.nat.name
  tags = var.tags
}

# ---------------------------------------------------------------------------
# GitHub Actions OIDC provider + CD role (no long-lived AWS keys).
# ---------------------------------------------------------------------------
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
  tags            = var.tags
}

data "aws_iam_policy_document" "github_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only workflows on the default branch of this repo may assume the role.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = compact([
        "repo:${var.github_repo}:ref:refs/heads/master",
        var.github_oidc_sub,
      ])
    }
  }
}

resource "aws_iam_role" "cd" {
  name               = "${var.name}-github-cd-role"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "cd" {
  # Sync the built SPA into the frontend bucket.
  statement {
    sid       = "FrontendSync"
    actions   = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [var.frontend_bucket_arn, "${var.frontend_bucket_arn}/*"]
  }

  # Invalidate CloudFront after a deploy. CreateInvalidation has no resource
  # level scoping worth the churn for a single distribution, so it is left at *.
  statement {
    sid       = "CloudFrontInvalidate"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["*"]
  }

  # Trigger and poll the app deploy via SSM Run Command.
  statement {
    sid = "SsmDeploy"
    actions = [
      "ssm:SendCommand",
      "ssm:ListCommandInvocations",
      "ssm:GetCommandInvocation",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "cd" {
  name   = "${var.name}-github-cd"
  role   = aws_iam_role.cd.id
  policy = data.aws_iam_policy_document.cd.json
}
