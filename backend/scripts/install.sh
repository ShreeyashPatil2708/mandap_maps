#!/bin/bash
set -euo pipefail

if [[ "${DEPLOYMENT_GROUP_NAME:-}" == *"dev"* ]]; then
  APP_DIR="/opt/mandapmaps/dev"
else
  APP_DIR="/opt/mandapmaps/prod"
fi

cd "$APP_DIR"
npm ci --omit=dev
