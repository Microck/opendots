# Requirements: Opendots

**Defined:** 2026-02-13
**Core Value:** People can quickly find and confidently evaluate OpenCode bundles before installing them.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication (GitHub)

- [x] **AUTH-01**: Publisher can sign in with GitHub OAuth
- [x] **AUTH-02**: Publisher session persists across browser refresh

### Publishing & Import

- [x] **PUBL-01**: Publisher can register a GitHub repo they control to publish a bundle
- [x] **PUBL-02**: ~~System enforces repo naming rule `opendots-<slug>` on registration~~ **REVISED:** System accepts any valid GitHub repo name (real-world repos use arbitrary names like `opencode-config`)
- [x] **PUBL-03**: ~~System requires `opendots.yml` (YAML) at repo root and validates it~~ **REVISED:** Manifest is optional; system derives metadata (name, description, license) from GitHub API when no manifest is present
- [x] **PUBL-04**: System imports bundle files from the repo and snapshots content for stable browsing
- [x] **PUBL-05**: Publisher can trigger a manual refresh (re-import) and see success/failure + errors
- [x] **PUBL-06**: Bundle page shows last imported commit + timestamp

### Discovery (Browse)

- [ ] **DISC-01**: Visitor can browse bundles as cards showing name + summary
- [ ] **DISC-02**: Bundle cards use a theme accent color when available (fallback if missing)
- [ ] **DISC-03**: Bundle cards display tags, risk badges, last updated, and GitHub stats
- [ ] **DISC-04**: Visitor can search bundles by text (name/summary/tags)
- [ ] **DISC-05**: Visitor can filter bundles by tag
- [ ] **DISC-06**: Visitor can filter bundles by artifact type (themes/commands/skills/plugins/tools/etc.)
- [ ] **DISC-07**: Visitor can filter bundles by OpenCode compatibility/version
- [ ] **DISC-08**: Visitor can sort bundles (at least newest; optional popular/trending)

### Bundle Detail (Great Bundle Pages)

- [x] **BNDL-01**: Visitor can open a bundle detail page
- [x] **BNDL-02**: Bundle detail page shows file tree of included artifacts
- [x] **BNDL-03**: Bundle detail page previews files with syntax highlighting where appropriate
- [x] **BNDL-04**: Bundle detail page shows bundle metadata (license, compat, tags, included features)
- [x] **BNDL-05**: Bundle detail page links to the source GitHub repo

### Validation, Scanning & Safety Signals

- [x] **SAFE-01**: System validates `opencode.json`/`opencode.jsonc` against OpenCode config schema when present
- [x] **SAFE-02**: System validates custom theme JSON against OpenCode theme schema when present
- [x] **SAFE-03**: System validates `SKILL.md` frontmatter rules when skills are present
- [x] **SAFE-04**: System detects and displays risk flags (executable code, shell `!`, remote URLs, etc.)
- [x] **SAFE-05**: System performs best-effort secret scanning and surfaces warnings
- [x] **SAFE-06**: Bundle detail page communicates the safety model clearly (warnings + “user responsible”)

### Downloads & Install

- [x] **DL-01**: Visitor can download a Project ZIP (preserves repo layout for project-level use)
- [x] **DL-02**: Visitor can download a Global ZIP (same layout, for `~/.config/opencode/` install)
- [x] **DL-03**: Bundle detail page provides install instructions for each download type

### Documentation

- [x] **DOCS-01**: Docs/install guide explains what bundles are, install destinations, and safety warnings

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Community

- **COMM-01**: User profiles for publishers
- **COMM-02**: Ratings/likes and reviews
- **COMM-03**: Collections / curated lists
- **COMM-04**: Fork/remix workflows

### Sync & Ops

- **SYNC-01**: Automatic sync via GitHub webhooks
- **SYNC-02**: Scheduled polling refresh

### UX

- **UX-01**: Mobile-friendly responsive UI
- **UX-02**: Bundle comparisons / diffs (bundle vs bundle)

### Downloads

- **DL-10**: OPENCODE_CONFIG_DIR-friendly download layout

### Security

- **SEC-01**: Deeper static analysis for plugins/tools (heuristics + scoring)
- **SEC-02**: “Verified publisher” program for executable bundles

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Safety guarantee / malware-free bundles | Not feasible; we provide best-effort scanning + warnings only |
| Direct file uploads | GitHub repo import is the publishing mechanism |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Done |
| AUTH-02 | Phase 1 | Done |
| PUBL-01 | Phase 1 | Done |
| PUBL-02 | Phase 1 | Done (revised) |
| PUBL-03 | Phase 1 | Done (revised) |
| PUBL-04 | Phase 1 | Done |
| PUBL-05 | Phase 1 | Done |
| PUBL-06 | Phase 1 | Done |
| BNDL-01 | Phase 2 | Done |
| BNDL-02 | Phase 2 | Done |
| BNDL-03 | Phase 2 | Done |
| BNDL-04 | Phase 2 | Done |
| BNDL-05 | Phase 2 | Done |
| SAFE-01 | Phase 2 | Done |
| SAFE-02 | Phase 2 | Done |
| SAFE-03 | Phase 2 | Done |
| SAFE-04 | Phase 2 | Done |
| SAFE-05 | Phase 2 | Done |
| SAFE-06 | Phase 2 | Done |
| DL-01 | Phase 2 | Done |
| DL-02 | Phase 2 | Done |
| DL-03 | Phase 2 | Done |
| DOCS-01 | Phase 2 | Done |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| DISC-05 | Phase 3 | Pending |
| DISC-06 | Phase 3 | Pending |
| DISC-07 | Phase 3 | Pending |
| DISC-08 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Done: 23 (Phase 1: 8, Phase 2: 15)
- Remaining: 8 (Phase 3)

---
*Requirements defined: 2026-02-13*
*Last updated: 2026-02-13 after Phase 2 completion + real-world alignment*
