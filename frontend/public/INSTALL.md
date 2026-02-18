# OpenDots - Install an OpenCode Bundle

> You are an AI coding agent helping a human install an OpenCode bundle from OpenDots. Follow this protocol exactly. Security review is mandatory.

---

## Base URLs

```bash
OPENDOTS_SITE_BASE="https://opendots.me"
OPENDOTS_API_BASE="$OPENDOTS_SITE_BASE"   # endpoints are under $OPENDOTS_API_BASE/api/...
```

If self-hosted, replace with deployment-specific origins.

---

## How To Use This Document (mandatory)

Do not browse the web for "how to install" and do not substitute other instructions.
This file is the source of truth.

If your runtime can run shell commands, fetch this document and follow it step-by-step:

```bash
curl -fsSL "https://opendots.me/INSTALL.md" -o /tmp/opendots-INSTALL.md
sed -n '1,160p' /tmp/opendots-INSTALL.md
```

---

## Step 0 - Confirm Input

Bundle input can be:

- Bundle URL: `https://opendots.me/bundle/<bundle-id-or-slug>`
- Short share URL: `https://opendots.me/<share-code>`
- Bundle ID (UUID)
- Bundle slug/name

Resolve this to one identifier string and use it in API calls.

If the input is a short share URL (`/{share-code}`), resolve it first:

```bash
curl -fsS "$OPENDOTS_API_BASE/api/share/{SHARE_CODE}" | cat
```

Then use returned `bundleId` as `{IDENTIFIER}`.

---

## Step 1 - Fetch Bundle Metadata

```bash
curl -fsS "$OPENDOTS_API_BASE/api/bundles/{IDENTIFIER}" | cat
```

Required fields to inspect:

- `id`, `name`, `summary`, `owner`, `githubFullName`, `repoUrl`
- `fileIndex`
- `safetyResults`
- `latestSnapshot`

If not found:

```text
Bundle not found. Verify the URL/ID/slug.
Browse available bundles at: {OPENDOTS_SITE_BASE}/browse
```

---

## Step 2 - Security Review (required)

If interactive questioning is supported, use it for approve/abort decisions.

### 2a. `safetyResults.secretWarnings`

If non-empty, stop and ask:

1. Abort installation (recommended)
2. Continue with manual file review

### 2b. `safetyResults.riskFlags`

Explain each flag and severity:

- `EXEC` / `EVAL` -> high risk
- `SHELL` -> medium risk
- `REMOTE` -> low risk

Offer to preview flagged files before proceeding.

### 2c. `safetyResults.validation`

Report invalid config/theme/skill files as quality warnings.

### 2d. Independent checks

Validate:

- file types align with bundle purpose
- no suspiciously large config files
- no unexpected executable content

Then ask for explicit approval to continue.

---

## Step 3 - Choose Install Scope (interactive)

Ask user:

1. `PROJECT` - install into the current project under `.opencode/` (OpenCode per-project config)
2. `GLOBAL` - install into `~/.config/opencode/` (OpenCode global config)

Set these variables:

```bash
# Set exactly one
INSTALL_SCOPE="project"   # or "global"
VARIANT="$INSTALL_SCOPE"  # used in the download URL
```

Set download variant accordingly:

- `project`
- `global`

---

## Step 4 - Download ZIP

```bash
curl -fsSL "$OPENDOTS_API_BASE/api/bundles/{IDENTIFIER}/download?variant=$VARIANT" -o /tmp/opendots-bundle.zip
file /tmp/opendots-bundle.zip
```

Expected `file` output includes `Zip archive data`.

---

## Step 5 - Inspect ZIP Before Extracting

```bash
unzip -l /tmp/opendots-bundle.zip
```

Confirm:

- paths are relative
- no path traversal (`..`)
- file list matches metadata expectations

Project install note:

- OpenCode loads per-project config from `.opencode/`.
- Some bundles ship files already nested under `.opencode/`.
- Others ship category folders at the zip root (e.g. `skills/`, `plugins/`).

Before extracting to a project, determine the project target directory:

```bash
# If the zip already contains .opencode/, extract into project root.
# Otherwise extract into .opencode/.

if command -v rg >/dev/null 2>&1; then
  ZIP_HAS_DOT_OPENCODE=$(unzip -l /tmp/opendots-bundle.zip | awk 'NR>3 && !/\/$/ && $NF!="" {print $NF}' | rg -m 1 '^\.opencode/' >/dev/null 2>&1 && echo "yes" || echo "no")
else
  ZIP_HAS_DOT_OPENCODE=$(unzip -l /tmp/opendots-bundle.zip | awk 'NR>3 && !/\/$/ && $NF!="" {print $NF}' | grep -E -m 1 '^\.opencode/' >/dev/null 2>&1 && echo "yes" || echo "no")
fi

if [ "$ZIP_HAS_DOT_OPENCODE" = "yes" ]; then
  PROJECT_TARGET_DIR="."
else
  PROJECT_TARGET_DIR=".opencode"
fi

echo "PROJECT_TARGET_DIR=$PROJECT_TARGET_DIR"

if [ "${INSTALL_SCOPE:-}" = "global" ] && [ "$ZIP_HAS_DOT_OPENCODE" = "yes" ]; then
  echo "WARNING: This ZIP contains .opencode/ (project-scoped layout)."
  echo "Recommended: abort GLOBAL install and choose PROJECT install instead."
  echo "If you continue anyway, OpenCode will not load files under ~/.config/opencode/.opencode/."
fi
```

Abort if suspicious.

---

## Step 6 - Conflict Check (interactive)

Detect conflicts before extracting.

```bash
# project target (uses PROJECT_TARGET_DIR from Step 5)
if [ -z "${PROJECT_TARGET_DIR:-}" ]; then
  echo "PROJECT_TARGET_DIR is not set. Run the detection snippet in Step 5 first."
  exit 1
fi

unzip -l /tmp/opendots-bundle.zip | awk 'NR>3 && !/\/$/ && $NF!="" {print $NF}' | while read f; do
  if [ "$PROJECT_TARGET_DIR" = "." ]; then
    [ -f "./$f" ] && echo "CONFLICT: ./$f"
  else
    [ -f "$PROJECT_TARGET_DIR/$f" ] && echo "CONFLICT: $PROJECT_TARGET_DIR/$f"
  fi
done

# global target
unzip -l /tmp/opendots-bundle.zip | awk 'NR>3 && !/\/$/ && $NF!="" {print $NF}' | while read f; do
  [ -f "$HOME/.config/opencode/$f" ] && echo "CONFLICT: ~/.config/opencode/$f"
done
```

If conflicts exist, ask user:

1. OVERWRITE (backup first)
2. SKIP conflicting files
3. ABORT

Backup format example:

```bash
cp "{file}" "{file}.opendots-backup.$(date +%Y%m%d%H%M%S)"
```

---

## Step 7 - Extract

```bash
# project
cd {project-root}

if [ -z "${PROJECT_TARGET_DIR:-}" ]; then
  echo "PROJECT_TARGET_DIR is not set. Run the detection snippet in Step 5 first."
  exit 1
fi

if [ "$PROJECT_TARGET_DIR" != "." ]; then
  mkdir -p "$PROJECT_TARGET_DIR"
fi

unzip -o /tmp/opendots-bundle.zip -d "$PROJECT_TARGET_DIR"

# global
mkdir -p ~/.config/opencode
unzip -o /tmp/opendots-bundle.zip -d ~/.config/opencode/

rm /tmp/opendots-bundle.zip
```

---

## Step 8 - Fill Redacted Values (interactive, recommended)

Some bundles intentionally ship with placeholders like `<REDACTED>`, `<REDACTED_IP>`, or `<REDACTED_EMAIL>`.
This is expected and is a safety feature.

If you see these placeholders, you must fill them locally before the bundle works.

Important rules:

- Do NOT paste secrets into chat.
- Enter secrets directly into your local files or your local environment variables.
- Never commit these secrets back to GitHub.

Find placeholders in the installed files:

```bash
# project scope
if command -v rg >/dev/null 2>&1; then
  if [ -n "${PROJECT_TARGET_DIR:-}" ]; then
    rg -n "<REDACTED" "$PROJECT_TARGET_DIR" 2>/dev/null || true
  fi

  # global scope
  rg -n "<REDACTED" "$HOME/.config/opencode" 2>/dev/null || true
else
  if [ -n "${PROJECT_TARGET_DIR:-}" ]; then
    grep -RIn "<REDACTED" "$PROJECT_TARGET_DIR" 2>/dev/null || true
  fi

  # global scope
  grep -RIn "<REDACTED" "$HOME/.config/opencode" 2>/dev/null || true
fi
```

If `opencode.public.json` is present:

- It is a *public* export; it will not include secret values.
- Copy any MCP definitions you want to use into your local OpenCode config (commonly `~/.config/opencode/opencode.jsonc`).
- Then add secrets locally, for example under the MCP entry's `environment` key.

If the agent is assisting you:

- The agent may list which files/keys are redacted.
- The agent should ask what values you want to use, but you should type them into the file yourself.

---

## Step 9 - Verify Install

```bash
# quick checks

# project scope (requires PROJECT_TARGET_DIR)
if [ -n "${PROJECT_TARGET_DIR:-}" ]; then
  ls -la "$PROJECT_TARGET_DIR"/themes/ 2>/dev/null || true
  ls -la "$PROJECT_TARGET_DIR"/agent/ "$PROJECT_TARGET_DIR"/agents/ 2>/dev/null || true
  ls -la "$PROJECT_TARGET_DIR"/commands/ 2>/dev/null || true
  ls -la "$PROJECT_TARGET_DIR"/skills/ 2>/dev/null || true
  ls -la "$PROJECT_TARGET_DIR"/plugins/ 2>/dev/null || true
  ls -la "$PROJECT_TARGET_DIR"/prompts/ 2>/dev/null || true
fi

# global scope
ls -la "$HOME/.config/opencode/themes/" 2>/dev/null || true
ls -la "$HOME/.config/opencode/agent/" "$HOME/.config/opencode/agents/" 2>/dev/null || true
ls -la "$HOME/.config/opencode/commands/" 2>/dev/null || true
ls -la "$HOME/.config/opencode/skills/" 2>/dev/null || true
ls -la "$HOME/.config/opencode/plugins/" 2>/dev/null || true

# metadata files might be present depending on bundle layout
ls -la opendots.yml opencode.public.json mcp.descriptions.json 2>/dev/null || true
```

Optional validation:

```bash
for f in themes/*.json 2>/dev/null; do
  python3 -c "import json; json.load(open('$f'))" 2>/dev/null && echo "[OK] $f" || echo "[X] $f"
done
```

---

## Step 10 - Report Outcome

Provide concise summary:

- Bundle installed (name/owner)
- Scope used (project/global)
- Installed file categories
- Any skipped/overwritten files and backup paths

Follow-up line:

```text
To update later:

1) Open: {OPENDOTS_SITE_BASE}/INSTALL.md
2) Follow it step-by-step for bundle URL: {OPENDOTS_SITE_BASE}/bundle/{identifier}
```

---

## File Kind Reference

- `config` -> config files and root dotfiles
- `theme` -> `themes/`
- `agent` -> `agent/` or `agents/`
- `command` -> `commands/`
- `skill` -> `skills/`
- `plugin` -> `plugins/` and `disabled-plugins/` (or under `.opencode/` for project installs)
- `tool` -> `tools/`
- `prompt` -> `prompts/`
- `mode` -> `modes/`
- `rules` -> `AGENTS.md` / `CLAUDE.md`
- `script` -> shell scripts
- `other` -> inspect manually
