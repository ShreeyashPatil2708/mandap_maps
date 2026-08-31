#!/bin/bash
set -euo pipefail

SECRET=$(aws secretsmanager get-secret-value \
  --secret-id mandapmaps-prod/app \
  --query SecretString \
  --output text \
  --region us-east-1)

export GROQ_API_KEY=$(echo "$SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['groq_api_key'])")
export POSTGRES_URL=$(echo "$SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['postgres_url'])")

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
