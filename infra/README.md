# MandapMaps AWS infrastructure (Terraform)

Lean, production-grade deployment of the MandapMaps stack in **ap-south-1
(Mumbai)**. Cloudflare sits at the edge; AWS runs the compute, data, and static
hosting.

## Architecture at a glance

```
                         Cloudflare (DNS, TLS, DDoS, cache)
                         /                                \
        apex / SPA  (proxied)                        /api/*  (proxied, DNS-only origin record)
                         |                                |
                 CloudFront (OAC)                        ALB  (SG: Cloudflare ranges + x-origin-secret header)
                         |                            /        \
                  S3 (private SPA)          /api/chat* :8000    /api/* :3000
                                            chatbot TG          api TG
                                                |                  |
                                     chatbot ASG (Spot, x86)   API ASG (on-demand, Graviton)
                                            \                  /
                                     private app subnets (egress via NAT instance)
                                                     |
                                            RDS Postgres (private data subnets, no internet)
```

- **Edge:** Cloudflare terminates TLS for browsers. It proxies the SPA to
  CloudFront and `/api/*` straight to the ALB. Putting CloudFront in front of
  the dynamic API was rejected: it doubles CDN cost on the burstiest festival
  traffic for no cache benefit. CloudFront is kept for the static SPA (private
  S3 via Origin Access Control).
- **Origin lock:** the ALB security group only accepts 80/443 from Cloudflare's
  published ranges (managed prefix list), and the HTTPS listener rejects any
  `/api` request missing the `x-origin-secret` header. A leaked ALB DNS name is
  therefore useless.
- **Compute:** API fleet is always-on on-demand Graviton (`t4g.micro`),
  target-tracked on ALB requests per target. Chatbot fleet is all-Spot,
  off-season desired 0, scaled up for the festival window.
- **Data:** RDS PostgreSQL `t4g.micro` in private subnets with no internet
  route, 7-day backups, one-variable Multi-AZ toggle for festival week.
- **Egress:** a single `t4g.nano` NAT instance (~USD 3/mo vs ~USD 32 for a NAT
  Gateway) with an EC2 auto-recovery alarm. S3 traffic uses the free gateway
  endpoint.
- **Secrets:** AWS Secrets Manager (`mandapmaps/database`, `mandapmaps/app`),
  read via instance IAM roles. No secrets in code or user-data.
- **CI/CD:** GitHub Actions via OIDC (no static keys). Frontend = S3 sync +
  CloudFront invalidation; app = SSM Run Command checking out the pushed commit
  SHA and restarting systemd.
- **Observability:** CloudWatch agent (mem/disk + logs), dashboard, alarms to an
  SNS email, and an AWS Budgets cap.

## Deviations from the original design note

- **Chatbot Spot pool is x86_64** (`t3.small / t3a.small / t3.medium`), not the
  originally listed `t3.small / t3a.small / t4g.small`. A single ASG mixed
  instances policy uses one AMI and cannot span arm64 + x86_64. x86 also avoids
  arm-wheel gaps in the torch / faiss stack. The API box stays arm64.
- **No us-east-1 ACM cert for CloudFront.** Because Cloudflare fronts
  CloudFront, the distribution uses its default `*.cloudfront.net` certificate.
  Only the ALB needs a (regional) ACM cert, for the origin hostname.

## Apply order

Terraform state lives in S3 + DynamoDB. Create that backend once, then apply
the root stack.

```bash
# 1. State backend (local state, run once)
cd infra/bootstrap
terraform init
terraform apply

# 2. Root stack
cd ..
cp terraform.tfvars.example terraform.tfvars   # then edit: alarm_email, origin_shared_secret
terraform init                                  # uses the S3 backend from step 1
terraform apply
```

During `apply`, Terraform pauses on the ALB ACM certificate validation. Add the
CNAME records from the `acm_validation_records` output as **DNS-only** records
in Cloudflare; once the cert is issued, `apply` continues. This is a one-time
step.

## Manual steps after apply

### Cloudflare (managed by hand, not Terraform)

1. `origin.<domain>` -> `alb_dns_name` output, **DNS-only (grey cloud)**.
2. Apex / SPA record proxied (orange cloud) to the `cloudfront_domain_name`
   output.
3. No Cloudflare path routing is needed: CloudFront itself sends `/api/*` to
   the ALB and injects the `x-origin-secret` header (the free Cloudflare plan
   can't rewrite Host/SNI, so Cloudflare proxies everything to CloudFront).
4. SSL/TLS mode **Full** (or **Full (strict)**).
5. Optional but recommended: the edge guard below.

### Edge guard (optional, off by default)

CloudFront also answers on its own `*.cloudfront.net` domain. A request sent
there skips Cloudflare, so it has one proxy hop fewer, and the client can
forge the X-Forwarded-For entry the API uses as the visitor IP for rate
limits. The edge guard closes that path with a secret header only Cloudflare
adds. **Order matters**: if CloudFront demands the header before Cloudflare
sends it, every visitor gets a 403.

1. Generate a long random value, e.g. `openssl rand -hex 32`.
2. Cloudflare dashboard -> Rules -> Transform Rules -> **Modify Request
   Header** -> create rule: when *Hostname* is `<domain>` or `www.<domain>`,
   **Set static** header `x-mm-edge-auth` = the value. Deploy it. (Harmless on
   its own: nothing checks the header yet.)
3. Set `edge_auth_secret` in `terraform.tfvars` to the same value, then
   `terraform plan` / `apply`. CloudFront now returns 403 for requests without
   it and strips the header before forwarding.
4. Check: `https://<domain>/` loads; `https://<cloudfront_domain_name>/` is 403.
5. Rollback: set `edge_auth_secret = ""` and apply (the guard detaches), then
   remove the Cloudflare rule if you want.

### GitHub Actions secrets

Set these repo secrets (values come from `terraform output`):

| Secret                        | Source output                |
| ----------------------------- | ---------------------------- |
| `AWS_ROLE_ARN`                | `cd_role_arn`                |
| `FRONTEND_BUCKET`             | `frontend_bucket`            |
| `CLOUDFRONT_DISTRIBUTION_ID`  | `cloudfront_distribution_id` |

### Secrets Manager

- Fill `GROQ_API_KEY` in the `mandapmaps/app` secret (left blank by Terraform;
  it will not be overwritten on later applies).
- The `mandapmaps/database` secret is fully populated by Terraform (host,
  password, `DATABASE_URL`, `ADMIN_SECRET`).

### Database migrate + seed (first deploy)

RDS is private. Connect from an API instance over SSM Session Manager, then run
the repo's migrate/seed against the endpoint (creds come from the database
secret). Upload the private `chatbot/seed-data.json` and prebuilt
`chatbot/faiss_index/` to the `data_bucket` (`aws s3 sync`) so chatbot instances
hydrate on boot.

## Festival scale-up

- Chatbot: raise `chatbot_min_size` / desired, or add entries to the ASG
  `scheduled_actions` variable for the Ganpati window.
- API: raise `api_min_size`.
- Database: set `db_multi_az = true`.

## Follow-up

- `backend/src/index.js` still comments about a CloudFront -> API Gateway hop
  and sets `trust proxy` to 2. The v2 path is Cloudflare -> ALB (2 proxy hops
  that append `X-Forwarded-For`), so the value still resolves the client IP, but
  the comment is stale. Left as an app change, out of scope for the infra build.
```
