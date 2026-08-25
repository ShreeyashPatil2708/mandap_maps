#!/bin/bash
set -euo pipefail

systemctl daemon-reload

if [[ "${DEPLOYMENT_GROUP_NAME:-}" == *"dev"* ]]; then
  SERVICE="mandapmaps-dev"
else
  SERVICE="mandapmaps-prod"
fi

systemctl enable "$SERVICE"
systemctl restart "$SERVICE"
