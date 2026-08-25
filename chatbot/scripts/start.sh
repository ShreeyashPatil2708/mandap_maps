#!/bin/bash
set -euo pipefail
systemctl daemon-reload
systemctl enable mandapmaps-chatbot
systemctl restart mandapmaps-chatbot
