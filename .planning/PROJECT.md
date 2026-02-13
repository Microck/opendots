# Opendots

## What This Is

Opendots is a public community website to publish, discover, and download OpenCode configuration “bundles” (dotfiles). Publishers connect via GitHub OAuth and register a repo they control; Opendots imports it, validates it, and presents a great bundle page with previews, safety signals, and downloads.

The core UX is discovery-first: a browse page of bundle cards (with theme-based color accents) and a detail page that makes it easy to understand what a bundle contains before installing it.

## Core Value

People can quickly find and confidently evaluate OpenCode bundles before installing them.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public browse page lists bundles as cards with theme accent color, key metadata, and safety badges
- [ ] Public browse page supports search + filters (tags, artifact types, OpenCode compat/version) + basic sorting
- [ ] Bundle detail page provides file tree + readable previews (syntax-highlighted where appropriate)
- [ ] Bundle detail page shows validation summary (config/theme/skill/frontmatter rules) and explicit risk flags
- [ ] Bundle detail page provides downloads for both layouts: project ZIP and global ZIP
- [ ] Bundle detail page provides clear install instructions for each download type
- [ ] Publisher can sign in with GitHub OAuth
- [ ] Publisher can register a GitHub repo they control to publish a bundle
- [ ] Importer enforces strict repo format: repo name `opendots-<slug>` and required manifest `opendots.yml` at repo root
- [ ] Publisher has a simple dashboard to view their bundles and trigger manual re-import (“refresh”) on demand
- [ ] Import pipeline snapshots imported content (so the UI is stable and doesn’t depend on live GitHub fetches)
- [ ] Opendots runs best-effort scanning (secrets + risky patterns) and clearly communicates that users are responsible for what they install
- [ ] Docs page explains what a bundle is, install destinations (project vs global), and safety model/limitations

### Out of Scope

- Mobile-first UI — v1 is desktop-only to keep scope tight
- Comments/ratings/collections/forks — community/social features deferred
- GitHub webhooks / automatic sync — v1 uses manual refresh only
- Direct file uploads — publishing is via importing a GitHub repo
- “Safety guarantee” — scanning is best-effort; we only provide signals and warnings

## Context

- OpenCode configuration is hybrid: a primary config file (`opencode.json`/`opencode.jsonc`) plus a directory tree (`.opencode/`, `~/.config/opencode/`) containing themes, commands, agents, modes, skills, plugins, custom tools, etc.
- Bundles are not a single universal format; Opendots will standardize a bundle format via a portal-specific manifest (`opendots.yml`) plus native OpenCode file formats.
- Security is central: OpenCode bundles can include executable JS/TS (plugins/tools) and commands that run shell via `!`. Opendots will allow these but must surface the risk clearly and scan where possible.
- Research notes and domain analysis exist in `deep-research-report (1).md`.

## Constraints

- **Budget**: Must be free to run for v1 (use OSS + free-tier hosting/services; avoid paid-only dependencies)
- **Platform**: Desktop-only UX for v1
- **Publishing**: GitHub OAuth + repo import; only repos the user controls
- **Bundle Format**: Repo name enforced as `opendots-<slug>` and `opendots.yml` required at repo root
- **Sync**: Manual refresh only in v1 (no webhooks)
- **Security**: Allow executable code but require scanning + prominent warnings + risk badges

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Public community portal | Discovery is the primary pain point | — Pending |
| GitHub OAuth + repo import | Publishing via repos is auditable and aligns with dotfiles workflows | — Pending |
| Enforce repo prefix `opendots-<slug>` | Keeps ecosystem consistent and simplifies importer expectations | — Pending |
| Require YAML manifest `opendots.yml` | First-class bundle metadata + validation | — Pending |
| v1: desktop-only | Reduce UX scope while shipping “great bundle pages” | — Pending |
| v1 sync: manual refresh | Reduce complexity (no webhooks) | — Pending |
| Allow plugins/tools/`!` but scan + warn | User responsibility, but the portal must surface risk | — Pending |

---
*Last updated: 2026-02-13 after initialization*
