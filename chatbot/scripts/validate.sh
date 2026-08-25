#!/bin/bash
set -euo pipefail

for i in $(seq 1 10); do
  if curl -sf "http://localhost:8000/health" > /dev/null; then
    echo "Health check passed on port 8000"
    exit 0
  fi
  sleep 3
done

echo "Health check failed after 30s on port 8000" >&2
exit 1
