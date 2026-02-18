#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: opendots-refresh.sh <owner/repo> [api-base]" >&2
  exit 1
fi

REPO_FULL="$1"
API_BASE="${2:-${OPENDOTS_API_BASE:-https://opendots.me}}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this script from inside your bundle git repository." >&2
  exit 1
fi

echo "Starting OpenDots refresh for ${REPO_FULL}..."

CLAIM_JSON=$(curl -fsS -X POST "${API_BASE}/api/publish/claim/start" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"${REPO_FULL}\"}")

echo "Claim start response:"
printf '%s\n' "${CLAIM_JSON}"

CLAIM_CODE=$(python3 - <<'PY' "${CLAIM_JSON}"
import json
import sys

payload = json.loads(sys.argv[1])
claim_code = payload.get('claimCode')
if isinstance(claim_code, str):
    print(claim_code)
else:
    print('')
PY
)

if [[ -z "${CLAIM_CODE}" ]]; then
  echo "No claimCode returned. If response contains CAPTCHA_FAILED, refresh from dashboard." >&2
  exit 1
fi

printf '%s\n' "${CLAIM_CODE}" > opendots-claim.txt
git add opendots-claim.txt

if ! git diff --cached --quiet; then
  git commit -m "chore: refresh OpenDots claim"
  git push
else
  echo "Claim file unchanged; skipping commit/push."
fi

COMPLETE_JSON=$(curl -fsS -X POST "${API_BASE}/api/publish/claim/complete" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"${REPO_FULL}\",\"claimCode\":\"${CLAIM_CODE}\"}")

echo "Claim complete response:"
printf '%s\n' "${COMPLETE_JSON}"

echo "Done. Verify with: ${API_BASE}/api/bundles"
