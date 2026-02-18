# OpenDots - Update an Existing Bundle

> You are an AI coding agent helping a human update an already-published OpenDots bundle. Follow this file exactly. Read this file in full before doing any work.

---

## Base URLs

```bash
OPENDOTS_SITE_BASE="https://opendots.me"
OPENDOTS_API_BASE="$OPENDOTS_SITE_BASE"
```

---

## Step 0 - Confirm inputs

Required inputs:

- GitHub repository: `owner/repo`
- Local repository path

Optional inputs:

- OpenDots bundle URL or bundle ID

---

## Fast path - One command refresh

After you commit and push your bundle changes, run this from the repo root:

```bash
curl -fsSL "$OPENDOTS_SITE_BASE/opendots-refresh.sh" | bash -s -- owner/repo
```

This automates claim start -> claim file commit/push -> claim complete.

---

## Step 1 - Update bundle files

Apply your file changes in the repository first.

Then regenerate README overview content by running Step 4.6 from `PUBLISH.md`.

Current behavior:

- Skills are emitted as name-only entries.
- Plugins keep purpose-focused summaries.
  - Registry files like `plugins/**/marketplace.json` are summarized as registries (they are NOT installed plugins).
- Commands/Agents/Themes/Tools keep short, purpose-focused summaries.
- MCP Servers keep purpose-focused summaries.
  - If any MCP entry is still generic, add an override in `mcp.descriptions.json` and re-run Step 4.6.

Fetch and inspect Step 4.6 (avoid brittle line numbers):

```bash
curl -fsSL "$OPENDOTS_SITE_BASE/PUBLISH.md" -o /tmp/opendots-PUBLISH.md
awk '/^## Step 4\.6/{flag=1} /^## Step 4\.7/{if(flag){exit}} flag{print}' /tmp/opendots-PUBLISH.md
```

Run the `python3 - <<'PY'` block from Step 4.6 in your repo root.

If Step 4.6 produces any MCP line that asks you to "Add an entry to `mcp.descriptions.json`":

1) Create/update `mcp.descriptions.json` in the repo root as a JSON object mapping MCP name -> description.
2) Re-run Step 4.6.

This is the intended workflow: OpenCode MCP configs usually do not include descriptive text.

Then run the Step 4.7 quality gate from `PUBLISH.md`.

```bash
curl -fsSL "$OPENDOTS_SITE_BASE/PUBLISH.md" -o /tmp/opendots-PUBLISH.md
awk '/^## Step 4\.7/{flag=1} /^## Step 5/{if(flag){exit}} flag{print}' /tmp/opendots-PUBLISH.md
```

---

## Step 2 - Commit + push bundle changes

From your repo root:

```bash
git add -- README.md opendots.yml opencode.public.json mcp.descriptions.json 2>/dev/null || true
git add -- AGENTS.md CLAUDE.md agents agent command commands skills themes plugins disabled-plugins tools prompts modes scripts 2>/dev/null || true

git commit -m "chore: update OpenDots bundle"
git push
```

---

## Step 3 - Trigger OpenDots refresh (loginless claim flow)

This path works for already-registered bundles and reimports latest repo content.

```bash
REPO_FULL="owner/repo"

CLAIM_JSON=$(curl -fsS -X POST "$OPENDOTS_API_BASE/api/publish/claim/start" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"$REPO_FULL\"}")

echo "$CLAIM_JSON" | cat

CLAIM_CODE=$(python3 - <<'PY' "$CLAIM_JSON"
import json, sys
payload = json.loads(sys.argv[1])
print(payload.get('claimCode', ''))
PY
)

if [ -z "$CLAIM_CODE" ]; then
  echo "No claimCode returned. If API returned CAPTCHA_FAILED, use Dashboard refresh instead."
  exit 1
fi

printf "%s\n" "$CLAIM_CODE" > opendots-claim.txt
git add opendots-claim.txt
git commit -m "chore: refresh OpenDots claim"
git push

curl -fsS -X POST "$OPENDOTS_API_BASE/api/publish/claim/complete" \
  -H "Content-Type: application/json" \
  -d "{\"repo\":\"$REPO_FULL\",\"claimCode\":\"$CLAIM_CODE\"}" | cat
```

If response includes `alreadyRegistered: true`, refresh worked.

---

## Step 4 - Verify update is live

```bash
curl -fsS "$OPENDOTS_API_BASE/api/bundles" | cat
curl -fsS "$OPENDOTS_API_BASE/api/bundles/{bundle-id-or-slug}" | cat
```

Confirm:

- `latestSnapshot.commitSha` matches latest commit
- file list contains expected updates
- `README.md` overview section includes generated inventory (name-only sections + richer Plugin/MCP summaries)
