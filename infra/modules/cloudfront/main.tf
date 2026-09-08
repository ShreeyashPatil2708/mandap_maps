# CloudFront fronts the static SPA (S3 via OAC) and also proxies the dynamic
# /api/* path to the ALB, so a single distribution does all path routing and
# Cloudflare only has to proxy the apex here. CloudFront sits behind Cloudflare,
# which terminates TLS for the browser, so the distribution uses its default
# *.cloudfront.net certificate (no custom domain and no us-east-1 ACM cert).

# Origin Access Control: the modern replacement for OAI. It signs CloudFront's
# requests to S3 with SigV4 so the bucket can stay fully private.
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.name}-frontend-oac"
  description                       = "OAC for the private frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Managed cache policy "CachingOptimized" for the immutable, fingerprinted SPA
# assets. index.html is uploaded with no-cache by the CD pipeline so releases
# are picked up immediately.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# The API is dynamic: disable caching and forward the full viewer request
# (all methods, headers except Host, query strings, cookies) to the ALB.
data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# SPA deep-link routing: rewrite extensionless paths to /index.html so client
# routes (e.g. /explore) resolve to the SPA entry point. Attached only to the
# default (S3) behavior, so genuine API status codes on /api/* are never
# rewritten (a distribution-wide custom_error_response would clobber them).
resource "aws_cloudfront_function" "spa_router" {
  name    = "${var.name}-spa-router"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      if (request.uri.indexOf('.') === -1) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.name} SPA"
  price_class         = "PriceClass_100" # NA + EU + India edge locations; cheapest tier

  origin {
    origin_id                = "frontend-s3"
    domain_name              = var.frontend_bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # The ALB origin, reached over HTTPS at the public origin hostname (whose ACM
  # cert matches, so TLS validates). The x-origin-secret header is the origin
  # lock: the ALB rejects any /api request without it, and only CloudFront adds
  # it, so a leaked ALB hostname cannot be used to bypass the edge.
  origin {
    origin_id   = "api-alb"
    domain_name = var.alb_origin_domain

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "x-origin-secret"
      value = var.origin_shared_secret
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true

    # SPA deep-link routing, scoped to the S3 behavior only (see the function).
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # Dynamic API path: send /api/* to the ALB, cache nothing, forward everything.
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api-alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = var.tags
}

# The single allowed policy on the frontend bucket: grant only this
# distribution read access, and deny non-TLS access. Owned here (not in the s3
# module) because it references the distribution ARN.
data "aws_iam_policy_document" "frontend" {
  statement {
    sid       = "AllowCloudFrontOAC"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${var.frontend_bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }

  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [var.frontend_bucket_arn, "${var.frontend_bucket_arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.frontend_bucket_id
  policy = data.aws_iam_policy_document.frontend.json
}
