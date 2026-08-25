terraform {
  backend "s3" {
    bucket       = "mandapmaps-tf-state"
    key          = "mandapmaps/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
  }
}
