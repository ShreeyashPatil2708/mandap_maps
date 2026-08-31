terraform {
  backend "s3" {
    bucket       = "mandapmaps-tf-state-v2"
    key          = "mandapmaps/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
