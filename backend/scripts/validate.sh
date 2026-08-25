#!/bin/bash
set -euo pipefail

if [[ "${DEPLOYMENT_GROUP_NAME:-}" == *"dev"* ]]; then
  PORT=3001
else
  PORT=3000
fi

# Wait up to 30s for the service to respond
for i in $(seq 1 10); do
  if curl -sf "http://localhost:${PORT}/health" > /dev/null; then
    echo "Health check passed on port ${PORT}"
    exit 0
  fi
  sleep 3
done

echo "Health check failed after 30s on port ${PORT}" >&2
exit 1
