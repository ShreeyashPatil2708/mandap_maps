provider "aws" {
  region = var.region

  default_tags {
    tags = local.common_tags
  }
}

# CloudFront viewer certificates must live in us-east-1, regardless of the
# stack's region. Used only for the CDN ACM cert.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.common_tags
  }
}
