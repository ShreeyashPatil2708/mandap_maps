#!/bin/bash
set -euo pipefail

APP_DIR="/opt/mandapmaps/python"
cd "$APP_DIR"

pip3 install -r requirements.txt --quiet
