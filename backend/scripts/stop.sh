#!/bin/bash
set -euo pipefail

# Detect environment from CodeDeploy deployment group name
if [[ "${DEPLOYMENT_GROUP_NAME:-}" == *"dev"* ]]; then
  SERVICE="mandapmaps-dev"
else
  SERVICE="mandapmaps-prod"
fi

systemctl stop "$SERVICE" || true
