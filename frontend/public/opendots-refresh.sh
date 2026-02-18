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

CLAIM_FILE_PATH=$(python3 - <<'PY' "${CLAIM_JSON}"
import json
import sys

payload = json.loads(sys.argv[1])
claim_path = payload.get('claimFilePath')
if isinstance(claim_path, str) and claim_path.strip():
    print(claim_path.strip())
else:
    print('opendots-claim.txt')
PY
)

if [[ -z "${CLAIM_CODE}" ]]; then
  echo "No claimCode returned. If response contains CAPTCHA_FAILED, refresh from dashboard." >&2
  exit 1
fi

printf '%s\n' "${CLAIM_CODE}" > "${CLAIM_FILE_PATH}"
git add "${CLAIM_FILE_PATH}"

if ! git diff --cached --quiet; then
  git commit -m "chore: refresh OpenDots claim"
  git push
else
  echo "Claim file unchanged; skipping commit/push."
fi

echo "Completing claim (may retry briefly for GitHub propagation)..."

attempt=1
max_attempts=6
sleep_s=0

while true; do
  if [[ ${sleep_s} -gt 0 ]]; then
    echo "Retrying in ${sleep_s}s..."
    sleep "${sleep_s}"
  fi

  RESPONSE=$(curl -sS -X POST "${API_BASE}/api/publish/claim/complete" \
    -H "Content-Type: application/json" \
    -d "{\"repo\":\"${REPO_FULL}\",\"claimCode\":\"${CLAIM_CODE}\"}" \
    -w "\nHTTP_STATUS:%{http_code}")

  STATUS=$(printf '%s' "${RESPONSE}" | awk -F'HTTP_STATUS:' 'END{print $2}')
  BODY=$(printf '%s' "${RESPONSE}" | awk -F'HTTP_STATUS:' 'BEGIN{ORS=""} {print $1}')

  echo "Claim complete response (attempt ${attempt}/${max_attempts}, http=${STATUS}):"
  printf '%s\n' "${BODY}"

  if [[ "${STATUS}" == "200" ]]; then
    break
  fi

  # Retry for transient GitHub raw propagation.
  if printf '%s' "${BODY}" | grep -q '"code":"CLAIM_NOT_FOUND"'; then
    if [[ ${attempt} -ge ${max_attempts} ]]; then
      echo "Claim still not found after retries. If you just pushed, wait 1-2 minutes and rerun. Otherwise refresh via Dashboard." >&2
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep_s=$((sleep_s * 2 + 3))
    continue
  fi

  if [[ "${STATUS}" == "429" ]]; then
    echo "Rate limited. Wait a bit and retry." >&2
  fi

  echo "Claim complete failed. See response above." >&2
  exit 1
done

echo "Done. Verify with: ${API_BASE}/api/bundles"
