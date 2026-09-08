#!/bin/bash
# Chatbot launch wrapper. Pulls the secrets the app needs out of Secrets
# Manager at start time and hands off to uvicorn. Non-secret config (REDIS_URL,
# ALLOWED_ORIGINS, LLM_PROVIDER, ENV) comes from the systemd EnvironmentFile
# (/etc/mandapmaps/chatbot.env) and is already in the environment here.
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
DB_SECRET_ID="${DB_SECRET_ID:-mandapmaps/database}"
APP_SECRET_ID="${APP_SECRET_ID:-mandapmaps/app}"

DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ID" --query SecretString --output text --region "$REGION")
APP_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$APP_SECRET_ID" --query SecretString --output text --region "$REGION")

# Postgres connection string comes from the shared database secret.
export POSTGRES_URL=$(echo "$DB_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin)['DATABASE_URL'])")

# Groq key and ingest gate come from the app secret. Use .get so a secret that
# predates a key still boots (the app treats a blank ingest key as open, but
# the ALB never routes to /api/ingest, so it stays unreachable).
export GROQ_API_KEY=$(echo "$APP_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('GROQ_API_KEY',''))")
export INGEST_API_KEY=$(echo "$APP_SECRET" | python3 -c "import sys,json; print(json.load(sys.stdin).get('INGEST_API_KEY',''))")

exec python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
