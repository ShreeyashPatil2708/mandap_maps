# Remote state backend. The bucket and lock table are created by
# infra/bootstrap (apply that first). If you changed the project name or region
# in bootstrap, update the values here to match, then run `terraform init`.
terraform {
  backend "s3" {
    bucket         = "mandapmaps-tfstate-ap-south-1-198302589061"
    key            = "root/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "mandapmaps-tfstate-lock"
    encrypt        = true
  }
}
