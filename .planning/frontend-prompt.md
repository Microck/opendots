Web application called "Opendots" — a community portal to discover and download OpenCode configuration bundles. Desktop-only. 7 pages total.

Global: Navigation bar on every page with: logo/wordmark "Opendots", link to Browse, link to Docs, and a sign-in button (shows user avatar + dropdown when authenticated). Footer with links to GitHub repo, docs, and "What is OpenCode?".

---

Page 1: Home / Landing

- Hero section explaining what Opendots is: a place to find and share OpenCode configuration bundles.
- Call-to-action button linking to the Browse page.
- A second CTA for publishers: "Publish your bundle" linking to sign-in / register repo flow.
- A small section showing a few featured/recent bundle cards (same card component used on Browse page) as a preview.

---

Page 2: Browse Bundles

- Grid of bundle cards. Each card shows:
  - Bundle name (text)
  - Summary (1-2 lines of text)
  - Tags (small labels/chips)
  - Risk badges (small indicators for: contains executable code, uses shell injection, uses remote fetch — only shown when true)
  - Last updated date
  - GitHub stars and forks count
  - An accent color stripe/element on the card derived from the bundle's theme primary color (if the bundle includes a theme with a `primary` color, use that color as a visual accent on the card; otherwise use a neutral default)
- Cards link to the bundle detail page.
- Above the grid:
  - Text search input (searches name, summary, tags)
  - Filter by tags (multi-select)
  - Filter by artifact type: dropdown or chip group with options: themes, commands, agents, modes, skills, plugins, tools, rules, config
  - Filter by OpenCode compatibility version (text input or dropdown)
  - Sort control with options: newest, oldest

---

Page 3: Bundle Detail

- Header area:
  - Bundle name
  - Summary
  - Author (GitHub username, linked to their GitHub profile)
  - License
  - Tags
  - OpenCode compatibility (min version, tested version)
  - List of features/artifact types included in the bundle
  - Link to source GitHub repository
  - Last imported commit hash (short) + timestamp
- Risk/safety section:
  - Risk badges (executable code, shell injection, remote fetch — only shown when applicable)
  - Validation summary: a list showing pass/fail/warning status for each validation check run (config schema, theme schema, skill frontmatter, secret scan)
  - A clear notice: "Opendots scans bundles for common issues but cannot guarantee safety. You are responsible for reviewing what you install."
- File browser section:
  - File tree (sidebar or collapsible list) showing all files included in the bundle, organized by path
  - Clicking a file shows its content in a code viewer panel with syntax highlighting (JSON, JSONC, YAML, Markdown, TypeScript, JavaScript, plain text)
- Download section:
  - Two download buttons:
    - "Download for Project" — downloads a ZIP with project layout (`opencode.json` + `.opencode/...` at root)
    - "Download for Global" — downloads a ZIP with global layout (`opencode.json` + subdirectories matching `~/.config/opencode/` structure)
  - Below each button, collapsible install instructions explaining where to extract the ZIP and any manual steps

---

Page 4: Sign In

- Single "Sign in with GitHub" button (OAuth flow).
- Brief text explaining that signing in lets you publish bundles.
- After sign-in, redirect to the Publisher Dashboard.

---

Page 5: Register Repo

- Only accessible when signed in.
- Text input for the GitHub repository URL or `owner/repo` identifier.
- Validation rules shown clearly:
  - Repo must be owned by the signed-in user (or they must be an admin/collaborator)
  - Repo name must follow the pattern `opendots-<slug>`
  - Repo must contain an `opendots.yml` file at the root
- A "Register" button that triggers validation + initial import.
- On success: redirect to Publisher Dashboard with the newly imported bundle visible.
- On failure: show specific error messages (wrong naming, missing manifest, manifest validation errors, access denied).

---

Page 6: Publisher Dashboard

- Only accessible when signed in.
- List of the user's registered bundles. Each row/card shows:
  - Bundle name
  - GitHub repo link
  - Last imported commit hash + timestamp
  - Import status (success / failed + error summary)
  - A "Refresh" button to trigger a manual re-import
  - A link to view the bundle detail page
- Button to register a new repo (links to Page 5).

---

Page 7: Docs / Install Guide

- Static content page with these sections:
  - "What is a bundle?" — explains that a bundle is a collection of OpenCode configuration files (themes, commands, agents, modes, skills, plugins, tools, rules, config) packaged together.
  - "How to install" — explains the two install destinations:
    - Project install: extract into your project root so `opencode.json` and `.opencode/` sit alongside your code
    - Global install: extract into `~/.config/opencode/` so the configuration applies to all projects
  - "Safety" — explains that bundles can contain executable code (plugins, tools, shell commands), that Opendots runs automated scans but cannot guarantee safety, and that users should review bundle contents before installing.
  - "How to publish" — explains the publishing flow: sign in with GitHub, create a repo named `opendots-<slug>`, add an `opendots.yml` manifest at the root, register the repo on Opendots.
