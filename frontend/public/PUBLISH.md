# OpenDots - Publish Your OpenCode Bundle

> You are an AI coding agent helping a human publish an OpenCode bundle to OpenDots. Follow this protocol exactly. Do not skip security review. Do not invent data.

---

## Base URLs

Set deployment URLs first.

```bash
OPENDOTS_SITE_BASE="https://opendots.me"
OPENDOTS_API_BASE="https://api.opendots.me"
```

If the human is using self-hosted OpenDots, replace both values accordingly.

Brand assets for README templates:

- `{OPENDOTS_SITE_BASE}/brand/opendots-banner.jpg`

---

## Step 0 - Ask Required Questions (interactive)

If your runtime supports interactive questions, use them. Otherwise ask the same questions as a numbered list and wait for answers.

Ask:

1. Repo choice
   - Use existing public repo
   - Create new public repo (`opendots-{github-username}` recommended)
2. Config source
   - Project-local `.opencode/`
   - Global `~/.config/opencode/`
   - Custom path provided by user
3. Bundle metadata
   - Display name
   - One-line summary
   - License for `opendots.yml` (default: MIT)
4. README template
   - Generate standard README template
   - Skip README template

Then confirm:

```text
I will:
1) scan for secrets and sanitize
2) structure files in OpenDots format
3) create opendots.yml
4) push to GitHub
5) register on OpenDots
Proceed?
```

Do not continue until user confirms.

---

## Step 1 - Locate Files

Collect OpenCode files from the selected source path.

Accepted locations and kinds:

- `themes/` or `.opencode/themes/` -> theme
- `agent/` or `agents/` or `.opencode/agents/` -> agent
- `commands/` or `command/` or `.opencode/commands/` -> command
- `skills/` or `.opencode/skills/` -> skill
- `plugins/` or `.opencode/plugins/` -> plugin
- `disabled-plugins/` or `.opencode/disabled-plugins/` -> plugin stash
- `tools/` or `.opencode/tools/` -> tool
- `prompts/` or `.opencode/prompts/` -> prompt
- `modes/` or `.opencode/modes/` -> mode
- `scripts/` or `.opencode/scripts/` -> script
- root files `AGENTS.md`, `CLAUDE.md` -> rules
- root files `opencode.json`, `opencode.jsonc`, `opendots.yml`, `opendots.yaml` -> config

---

## Step 2 - Security Audit (required)

Scan every candidate file before publishing.

Remove or redact:

- Access tokens (`ghp_`, `github_pat_`, `glpat-`, `xoxb-`, etc.)
- Private keys (`-----BEGIN ... PRIVATE KEY-----`)
- Passwords and API keys in plaintext
- Connection strings with embedded credentials
- `.env*` files and private SSH keys (exclude entirely)

After sanitizing, show summary and wait for approval:

```text
SECURITY AUDIT RESULTS
- Scanned files: {N}
- Sanitized findings: {N}
- Excluded files: {list}
Continue?
```

---

## Step 3 - Repository Structure

Use this preferred layout (clean and consistent):

```text
opendots-{username}/
|- opendots.yml
|- README.md
|- opencode.json (optional)
|- opencode.jsonc (optional)
|- AGENTS.md (optional)
|- CLAUDE.md (optional)
|- themes/
|- agent/
|- commands/
|- skills/
|- plugins/
|- disabled-plugins/
|- tools/
|- prompts/
|- modes/
`- scripts/
```

Notes:

- Root-level folders are preferred over `.opencode/*` for published bundles.
- Keep only relevant files. Exclude build/dependency artifacts.
- Keep archive under 25 MB.

---

## Step 4 - Create `opendots.yml`

Create manifest at repo root.

```yaml
id: "opendots-{username}"
name: "{Display Name}"
summary: "{One-line summary}"
license: "{SPDX license, e.g. MIT}"

tags:
  - {tag1}
  - {tag2}

compatibility:
  opencode: ">=1.0"
```

Rules:

- `id` should match repo slug when possible.
- `summary` max ~280 chars.
- `license` is required in manifest even if README omits license section.

---

## Step 4.5 - Optional README Template

If user asked for README generation, use this objective template.

```markdown
<p align="center">
  <a href="{OPENDOTS_SITE_BASE}">
    <img src="{OPENDOTS_SITE_BASE}/brand/opendots-banner.jpg" alt="OpenDots" style="max-width: 100%; border-radius: 8px;" />
  </a>
</p>

<h1 align="center">{GitHub username} OpenDots Bundle</h1>

<p align="center">
  <a href="{OPENDOTS_SITE_BASE}/bundle/{bundle-id}">View on OpenDots</a> •
  <a href="#install">Install</a> •
  <a href="#contents">Contents</a>
</p>

---

## Install

```
Fetch and follow {OPENDOTS_SITE_BASE}/INSTALL.md for bundle URL: {OPENDOTS_SITE_BASE}/bundle/{bundle-id}
```

## Contents

- **{Category 1}** - {file list and purpose}
- **{Category 2}** - {file list and purpose}
- **{Category 3}** - {file list and purpose}

## Safety

This bundle is scanned by OpenDots. Review safety badges and file previews before installing.

## Discover More

- **[Browse bundles]({OPENDOTS_SITE_BASE}/browse)** - Explore community configs
- **[Publish your own]({OPENDOTS_SITE_BASE})** - Share your OpenCode setup
- **[OpenDots]({OPENDOTS_SITE_BASE})** - Registry homepage
```

---

## Step 5 - Push to GitHub

Recommended canonical repo: `opendots-{github-username}`.

```bash
gh repo view {username}/opendots-{username} 2>/dev/null || \
  gh repo create opendots-{username} --public --description "OpenCode config bundle"

cd opendots-{username}
git init
git add .
git commit -m "feat: publish OpenDots bundle"
git branch -M main
git remote add origin https://github.com/{username}/opendots-{username}.git
git push -u origin main
```

If repo already exists with history, commit to current default branch instead of re-initializing.

---

## Step 6 - Register on OpenDots

### Option A: Claim flow (no web login)

1. Start claim:

```bash
curl -fsS -X POST "$OPENDOTS_API_BASE/api/publish/claim/start" \
  -H "Content-Type: application/json" \
  -d '{"repo":"owner/repo"}'
```

2. Create `opendots-claim.txt` in repo root with exact `claimCode`.
3. Commit and push claim file.
4. Complete claim:

```bash
curl -fsS -X POST "$OPENDOTS_API_BASE/api/publish/claim/complete" \
  -H "Content-Type: application/json" \
  -d '{"repo":"owner/repo","claimCode":"<claimCode>"}'
```

### Option B: Dashboard flow (GitHub sign-in)

1. Visit `{OPENDOTS_SITE_BASE}/signin`
2. Sign in with GitHub
3. Publish from Dashboard

---

## Step 7 - Verify

```bash
curl -fsS "$OPENDOTS_API_BASE/api/bundles" | cat
curl -fsS "$OPENDOTS_API_BASE/api/bundles/{bundle-id}" | cat
```

Success criteria:

- Bundle appears in list
- Bundle detail returns metadata
- Snapshot/fileIndex present after import

If verification fails, report exact failing endpoint and response.
