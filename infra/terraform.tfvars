region      = "us-east-1"
environment = "prod"
vpc_cidr    = "10.0.0.0/16"
github_repo = "ShreeyashPatil2708/mandap_maps"

# ID-based OIDC subject: this org enabled a custom subject claim template, so
# GitHub emits repo:owner@<owner_id>/repo@<repo_id>:ref:... Owner ID 136688031,
# repo ID 1333245810. Verified via CloudTrail AssumeRoleWithWebIdentity events.
github_oidc_sub = "repo:ShreeyashPatil2708@136688031/mandap_maps@1333245810:*"
