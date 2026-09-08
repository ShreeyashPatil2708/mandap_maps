# Copy to terraform.tfvars and fill in real values. Never commit terraform.tfvars.

# Email that receives CloudWatch alarms and budget alerts.
alarm_email = "patilshreeyash2708@gmail.com"

# Shared secret Cloudflare must send in the x-origin-secret header on /api
# requests. Generate a long random value, e.g. `openssl rand -hex 32`, and set
# the same value in the Cloudflare Transform Rule that adds this header.
origin_shared_secret = "ff0706a2eaf70f552c6466695b9929a0550ecfd0eee51e5655df8db8a08d73ea"

# Repo the instances clone and CI/CD deploys from. The module defaults point at
# a non-existent "website" repo; the real repo is mandap_maps.
github_repo  = "ShreeyashPatil2708/mandap_maps"
app_repo_url = "https://github.com/ShreeyashPatil2708/mandap_maps.git"

# Optional overrides (defaults shown):
# domain_name            = "mandapmaps.in"
# region                 = "ap-south-1"
# db_multi_az            = false
# monthly_budget_usd     = 60
