# Opendots

## What This Is

Opendots is a public community website to publish, discover, and download OpenCode configuration "bundles" (dotfiles). Publishers connect via GitHub OAuth and register a repo they control; Opendots imports it, validates it, and presents a great bundle page with previews, safety signals, and downloads.

The core UX is discovery-first: a browse page of bundle cards (with theme-based color accents) and a detail page that makes it easy to understand what a bundle contains before installing it.

## Core Value

People can quickly find and confidently evaluate OpenCode bundles before installing them.

## Requirements

### Validated

- ✓ Public browse page lists bundles as cards with theme accent color, key metadata, and safety badges — v1.0
- ✓ Public browse page supports search + filters (tags, artifact types, OpenCode compat/version) + basic sorting — v1.0
- ✓ Bundle detail page provides file tree + readable previews (syntax-highlighted where appropriate) — v1.0
- ✓ Bundle detail page shows validation summary (config/theme/skill/frontmatter rules) and explicit risk flags — v1.0
- ✓ Bundle detail page provides downloads for both layouts: project ZIP and global ZIP — v1.0
- ✓ Bundle detail page provides clear install instructions for each download type — v1.0
- ✓ Publisher can sign in with GitHub OAuth — v1.0
- ✓ Publisher can register a GitHub repo they control to publish a bundle — v1.0
- ✓ Importer enforces strict repo format: repo name `opendots-<slug>` and required manifest `opendots.yml` at repo root — v1.0
- ✓ Publisher has a simple dashboard to view their bundles and trigger manual re-import ("refresh") on demand — v1.0
- ✓ Import pipeline snapshots imported content (so the UI is stable and doesn't depend on live GitHub fetches) — v1.0
- ✓ Opendots runs best-effort scanning (secrets + risky patterns) and clearly communicates that users are responsible for what they install — v1.0
- ✓ Docs page explains what a bundle is, install destinations (project vs global), and safety model/limitations — v1.0

### Active

- [ ] Mobile-friendly responsive UI
- [ ] GitHub webhooks for automatic sync
- [ ] User profiles for publishers
- [ ] Ratings/likes and reviews
- [ ] Collections / curated lists
- [ ] Bundle comparisons / diffs

### Out of Scope

- Mobile-first UI — v1 is desktop-only to keep scope tight
- Comments/ratings/collections/forks — community/social features deferred
- GitHub webhooks / automatic sync — v1 uses manual refresh only
- Direct file uploads — publishing is via importing a GitHub repo
- "Safety guarantee" — scanning is best-effort; we only provide signals and warnings

## Context

**Current Status:** v1.0 shipped 2026-02-14

- OpenCode configuration is hybrid: a primary config file (`opencode.json`/`opencode.jsonc`) plus a directory tree (`.opencode/`, `~/.config/opencode/`) containing themes, commands, agents, modes, skills, plugins, custom tools, etc.
- Bundles are not a single universal format; Opendots standardizes a bundle format via a portal-specific manifest (`opendots.yml`) plus native OpenCode file formats.
- Security is central: OpenCode bundles can include executable JS/TS (plugins/tools) and commands that run shell via `!`. Opendots allows these but surfaces the risk clearly and scans where possible.

**Tech Stack:**
- Frontend: Vite + React 19 + TypeScript + React Router + CSS Modules
- Backend: Fastify + Better Auth (GitHub OAuth) + Drizzle + SQLite
- Storage: Local filesystem for snapshots (`backend/storage/snapshots/`)

**Frontend state:** All 7 pages wired to real backend data. Browse and Home show live bundle cards. Detail page has file explorer, safety signals, and downloads.

**Backend state:** API at port 8787. GitHub OAuth requires environment variables. Database seeded with 4 demo bundles.

## Frontend Architecture

The frontend lives at `frontend/` and is a Vite + React 19 + TypeScript SPA using React Router for client-side navigation.

**Tech stack:**
- Vite (build tool)
- React 19 + TypeScript
- React Router DOM (client-side routing)
- CSS Modules (per-component scoped styles)
- Google Fonts: Inter (display/body), Space Mono (monospace)

**Pages (7 total):**

| Route | Page | Component |
|-------|------|-----------|
| `/` | Home / Landing | `src/pages/Home.tsx` |
| `/browse` | Browse Bundles | `src/pages/Browse.tsx` |
| `/bundle/:id` | Bundle Detail | `src/pages/Detail.tsx` |
| `/signin` | Sign In (GitHub OAuth) | `src/pages/SignIn.tsx` |
| `/dashboard` | Publisher Dashboard | `src/pages/Dashboard.tsx` |
| `/register` | Register Repo | `src/pages/Register.tsx` |
| `/docs` | Docs / Install Guide | `src/pages/Docs.tsx` |

**Reusable components:**

| Component | Purpose |
|-----------|---------|
| `Navbar` | Sticky nav with logo, links, auth state |
| `Footer` | Footer with logo, copyright, links |
| `BundleCard` | Card showing bundle name, summary, tags, risk badges, stars, updated |
| `CodeExplorer` | Split-pane file tree + syntax-highlighted code viewer |

**Design system (CSS variables):**
- Deep blue background (`#0a2590`) with subtle grid pattern
- White text on blue, muted blue (`#8ca5ff`) for secondary text
- Sharp edges (border-radius: 0), monospace accents
- Risk badges in red (`#ff6b6b`), success in green (`#4caf50`), pending in amber (`#ff9800`)

**Current state:** All pages wired to real backend data. No mock data.

## Constraints

- **Budget**: Must be free to run for v1 (use OSS + free-tier hosting/services; avoid paid-only dependencies)
- **Platform**: Desktop-only UX for v1
- **Frontend**: Vite + React + TypeScript SPA; design generated externally and componentized; CSS Modules for styling
- **Publishing**: GitHub OAuth + repo import; only repos the user controls
- **Bundle Format**: Repo name enforced as `opendots-<slug>` and `opendots.yml` required at repo root
- **Sync**: Manual refresh only in v1 (no webhooks)
- **Security**: Allow executable code but require scanning + prominent warnings + risk badges

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Public community portal | Discovery is the primary pain point | ✓ Good |
| GitHub OAuth + repo import | Publishing via repos is auditable and aligns with dotfiles workflows | ✓ Good |
| Enforce repo prefix `opendots-<slug>` | Keeps ecosystem consistent and simplifies importer expectations | ✓ Good |
| Require YAML manifest `opendots.yml` | First-class bundle metadata + validation | ✓ Good |
| v1: desktop-only | Reduce UX scope while shipping "great bundle pages" | ✓ Good |
| v1 sync: manual refresh | Reduce complexity (no webhooks) | ✓ Good |
| Allow plugins/tools/`!` but scan + warn | User responsibility, but the portal must surface risk | ✓ Good |
| Frontend: Vite + React + TypeScript | Free, fast, strong TS support; design was generated externally | ✓ Good |
| Frontend: CSS Modules (no Tailwind) | Scoped styles matching the external design pixel-for-pixel | ✓ Good |
| Frontend: React Router (client-side SPA) | Simple routing for 7 pages; no SSR needed for v1 | ✓ Good |
| Frontend: delegated to external design tool | UI shell designed externally, then componentized in React | ✓ Good |

---
*Last updated: 2026-02-14 after v1.0 milestone*
