#!/bin/bash
# Ship the private dataset to prod: reseed the DB with seed-data.json and rebuild
# the chatbot FAISS index. The dataset is gitignored, so CD never carries it;
# this pushes it out-of-band via S3 + SSM. Idempotent (seed.js upserts).
#
# Usage:  AWS_PROFILE=deploy ./deploy-data.sh
# Creds MUST resolve to account 198302589061 (the script refuses otherwise).
set -euo pipefail

ACCOUNT_EXPECTED=198302589061
export AWS_REGION=${AWS_REGION:-us-east-1}
CD_BUCKET=mandapmaps-prod-codedeploy-${ACCOUNT_EXPECTED}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n=== %s ===\n' "$*"; }

# ---- 0. Safety: right account, files present -------------------------------
say "Checking identity"
ACCT=$(aws sts get-caller-identity --query Account --output text)
if [[ "$ACCT" != "$ACCOUNT_EXPECTED" ]]; then
  echo "ABORT: creds resolve to $ACCT, expected $ACCOUNT_EXPECTED"; exit 1
fi
echo "OK: account $ACCT, region $AWS_REGION"
test -f "$ROOT/backend/db/seed-data.json"   || { echo "missing backend/db/seed-data.json"; exit 1; }
test -f "$ROOT/chatbot/ingest_seed_data.py" || { echo "missing chatbot/ingest_seed_data.py"; exit 1; }

# ---- resolve running instances behind the node + python ASGs ---------------
asg_instance() {  # $1 = substring to match in the ASG name (node|python)
  local asg iid
  asg=$(aws autoscaling describe-auto-scaling-groups \
        --query "AutoScalingGroups[?contains(AutoScalingGroupName,'$1')].AutoScalingGroupName | [0]" \
        --output text)
  [[ "$asg" == "None" || -z "$asg" ]] && { echo "no ASG matching '$1'" >&2; return 1; }
  iid=$(aws ec2 describe-instances \
        --filters "Name=tag:aws:autoscaling:groupName,Values=$asg" \
                  "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].InstanceId | [0]' --output text)
  [[ "$iid" == "None" || -z "$iid" ]] && { echo "no running instance in $asg" >&2; return 1; }
  echo "$iid"
}

# ---- helper: run commands on an instance via SSM and stream the result -----
ssm_run() {  # $1 = instance id, $2 = comment, $3 = JSON array body of commands
  local iid=$1 comment=$2 body=$3 cid status
  cid=$(aws ssm send-command --instance-ids "$iid" \
        --document-name AWS-RunShellScript --comment "$comment" \
        --parameters "commands=$body" --query Command.CommandId --output text)
  echo "  command $cid dispatched; waiting..."
  while true; do
    status=$(aws ssm list-command-invocations --command-id "$cid" \
             --query 'CommandInvocations[0].Status' --output text 2>/dev/null || echo Pending)
    case "$status" in
      Success|Failed|Cancelled|TimedOut) break ;;
      *) sleep 5 ;;
    esac
  done
  aws ssm list-command-invocations --command-id "$cid" --details \
    --query 'CommandInvocations[].CommandPlugins[].Output' --output text
  echo "  -> $status"
  [[ "$status" == Success ]]
}

# ---- 1. reseed the prod DB (node ASG) --------------------------------------
say "Reseeding prod DB (107 ganpatis)"
NODE_IID=$(asg_instance node); echo "node instance: $NODE_IID"
aws s3 cp "$ROOT/backend/db/seed-data.json" "s3://$CD_BUCKET/seed-data.json"
ssm_run "$NODE_IID" "reseed 107 ganpatis" '[
  "set -e",
  "cd /opt/mandapmaps/repo/backend",
  "aws s3 cp s3://'"$CD_BUCKET"'/seed-data.json db/seed-data.json",
  "export AWS_REGION=us-east-1 DB_SECRET_ID=mandapmaps-prod/database PGSSL=true",
  "node db/migrate.js",
  "node db/seed.js"
]'

# ---- 2. rebuild chatbot FAISS index (python ASG) ---------------------------
say "Rebuilding chatbot FAISS index"
PY_IID=$(asg_instance python); echo "python instance: $PY_IID"
aws s3 cp "$ROOT/chatbot/ingest_seed_data.py" "s3://$CD_BUCKET/ingest_seed_data.py"
ssm_run "$PY_IID" "rebuild FAISS for 107 ganpatis" '[
  "set -e",
  "cd /opt/mandapmaps/python",
  "aws s3 cp s3://'"$CD_BUCKET"'/seed-data.json seed-data.json",
  "aws s3 cp s3://'"$CD_BUCKET"'/ingest_seed_data.py ingest_seed_data.py",
  "export AWS_REGION=us-east-1 APP_SECRET_ID=mandapmaps-prod/app",
  "export FAISS_INDEX_PATH=/opt/mandapmaps/faiss/index.bin FAISS_METADATA_PATH=/opt/mandapmaps/faiss/metadata.json",
  "python3 ingest_seed_data.py",
  "sudo systemctl restart mandapmaps-chatbot"
]' || echo "WARN: FAISS rebuild step failed (see output above) - DB reseed still succeeded"

# ---- 3. verify -------------------------------------------------------------
say "Verifying live API"
COUNT=$(curl -fsS https://mandapmaps.in/api/ganpatis | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
echo "GET /api/ganpatis -> $COUNT records (expect 107)"
