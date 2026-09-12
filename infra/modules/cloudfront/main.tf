# CloudFront fronts the static SPA (S3 via OAC) and also proxies the dynamic
# /api/* path to the ALB, so a single distribution does all path routing and
# Cloudflare only has to proxy the apex here. CloudFront sits behind Cloudflare,
# and lists the apex + www as aliases with a us-east-1 ACM cert (passed in as
# acm_certificate_arn), because the free Cloudflare plan cannot rewrite the Host
# header it forwards.

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

# AWS-managed security headers for the SPA: HSTS, X-Content-Type-Options,
# X-Frame-Options SAMEORIGIN, Referrer-Policy and X-XSS-Protection. The API
# behavior is left alone (helmet already sets these on API responses).
data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

# Optional edge guard (off while edge_auth_secret is empty). When on, every
# request must carry the x-mm-edge-auth header that the Cloudflare Transform
# Rule adds; anything else (e.g. someone calling the *.cloudfront.net domain
# directly, which could spoof X-Forwarded-For) gets a 403. The header is then
# removed so it never reaches S3, the ALB, or logs. The snippet is appended to
# an existing line, so with the guard off the function code is byte-identical
# to before and a plan shows no change.
locals {
  edge_guard_enabled = var.edge_auth_secret != ""
  edge_check_js = local.edge_guard_enabled ? join("\n", [
    "",
    "      var auth = request.headers['x-mm-edge-auth'];",
    "      if (!auth || auth.value !== ${jsonencode(var.edge_auth_secret)}) {",
    "        return { statusCode: 403, statusDescription: 'Forbidden' };",
    "      }",
    "      delete request.headers['x-mm-edge-auth'];",
  ]) : ""
}

# Canonical host redirect, off while canonical_host is empty. The site answers
# on the apex, on www and on the distribution domain, which search engines would
# otherwise treat as three copies of every page.
locals {
  canonical_host_js = var.canonical_host != "" ? join("\n", [
    "",
    "      var host = request.headers.host ? request.headers.host.value : '';",
    "      if (host && host !== ${jsonencode(var.canonical_host)}) {",
    "        return redirect('https://' + ${jsonencode(var.canonical_host)} + uri + query(request.querystring));",
    "      }",
  ]) : ""
}

# Routing for the static site. The frontend build prerenders each route to its
# own file (frontend/scripts/prerender.mjs), so a pandal URL must reach that
# file rather than the SPA entry point, or a crawler would get the home page
# (and the home page's canonical tag) on every pandal.
#
#   /                      -> /index.html
#   /explore, /ganpati/x   -> /explore/index.html, /ganpati/x/index.html
#   anything else          -> /index.html, where the app shows "Page not found"
#
# An unknown pandal slug resolves to a missing S3 key, which comes back as 403
# and becomes the real 404 page (see custom_error_response below).
#
# Attached only to the default (S3) behavior, so genuine API status codes on
# /api/* are never rewritten.
resource "aws_cloudfront_function" "spa_router" {
  name    = "${var.name}-spa-router"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    var PRERENDERED = /^\/(explore|route|privacy|ganpati\/[a-z0-9-]+)$/;

    function query(querystring) {
      var parts = [];
      for (var key in querystring) {
        var entry = querystring[key];
        if (entry.multiValue) {
          for (var i = 0; i < entry.multiValue.length; i++) {
            parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.multiValue[i].value));
          }
        } else {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(entry.value));
        }
      }
      return parts.length ? '?' + parts.join('&') : '';
    }

    function redirect(location) {
      return {
        statusCode: 301,
        statusDescription: 'Moved Permanently',
        headers: { location: { value: location } },
      };
    }

    function handler(event) {
      var request = event.request;${local.edge_check_js}
      var uri = request.uri;${local.canonical_host_js}

      if (uri.length > 1 && uri.charAt(uri.length - 1) === '/') {
        return redirect(uri.slice(0, -1) + query(request.querystring));
      }

      if (uri.indexOf('.') === -1) {
        request.uri = PRERENDERED.test(uri) ? uri + '/index.html' : '/index.html';
      }

      return request;
    }
  EOT
}

# Edge guard for the /api behavior (which has no other function). Exists only
# while the guard is on.
resource "aws_cloudfront_function" "edge_guard" {
  count   = local.edge_guard_enabled ? 1 : 0
  name    = "${var.name}-edge-guard"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;${local.edge_check_js}
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.name} SPA"
  price_class         = "PriceClass_100" # NA + EU + India edge locations; cheapest tier

  # Alternate domain names so CloudFront accepts the Host that Cloudflare
  # forwards (mandapmaps.in / www). Requires the matching us-east-1 ACM cert.
  aliases = var.aliases

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

  # The private photos bucket, read through the same OAC (an OAC is not tied to
  # one bucket; each bucket's policy decides who may read it). Only /photos/*
  # reaches this origin, and object keys carry the photos/ prefix to match.
  origin {
    origin_id                = "photos-s3"
    domain_name              = var.photos_bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id           = "frontend-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = true

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

    # Edge guard, attached only while it is on (see edge_check_js above).
    dynamic "function_association" {
      for_each = aws_cloudfront_function.edge_guard
      content {
        event_type   = "viewer-request"
        function_arn = function_association.value.arn
      }
    }
  }

  # Pandal photos: content-hashed WebP files uploaded with an immutable
  # Cache-Control, so they cache like the SPA assets. WebP is already
  # compressed, so edge compression is off.
  ordered_cache_behavior {
    path_pattern               = "/photos/*"
    target_origin_id           = "photos-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
    compress                   = false

    # Edge guard, attached only while it is on (see edge_check_js above).
    dynamic "function_association" {
      for_each = aws_cloudfront_function.edge_guard
      content {
        event_type   = "viewer-request"
        function_arn = function_association.value.arn
      }
    }
  }

  # A path that does not exist in the bucket (an unknown pandal slug, say) comes
  # back from S3 as 403, because the OAC policy grants GetObject and nothing
  # else. Serve the prerendered 404 page with a real 404 status so search
  # engines drop the URL instead of indexing an error.
  #
  # Deliberately scoped to 403 alone: the API behavior returns genuine 404s
  # (/api/ganpatis/<unknown>) that must reach the client as JSON, so there is no
  # distribution-wide error page here. The ALB's own 403 (a request without the
  # origin secret) can only happen if the edge is misconfigured.
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != "" ? "TLSv1.2_2021" : null
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

# Same shape for the photos bucket: this distribution may read objects, and
# non-TLS access is denied. Replaces the TLS-only policy the s3 module used to
# own for this bucket (see the moved block in the root main.tf). The app fleet's
# read access comes from its IAM role, which a bucket policy Allow doesn't limit.
data "aws_iam_policy_document" "photos" {
  statement {
    sid       = "AllowCloudFrontOAC"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${var.photos_bucket_arn}/*"]

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
    resources = [var.photos_bucket_arn, "${var.photos_bucket_arn}/*"]

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

resource "aws_s3_bucket_policy" "photos" {
  bucket = var.photos_bucket_id
  policy = data.aws_iam_policy_document.photos.json
}
