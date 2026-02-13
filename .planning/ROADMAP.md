# Roadmap: Opendots

## Overview

Opendots ships in three coherent phases: first establish trusted publishing via GitHub import + stable snapshots, then deliver great bundle detail pages with safety signals and downloads, and finally build discovery-first browsing with search/filter/sort powered by the imported snapshot data.

**Frontend scaffolding:** A Vite + React + TypeScript SPA with all 7 pages and reusable components already exists in `frontend/`. All pages currently render with static mock data. Each phase will wire real backend data into the existing UI components rather than building pages from scratch.

**Frontend components available:**
- `Navbar` (auth state aware), `Footer`, `BundleCard`, `CodeExplorer`
- Pages: `Home`, `Browse`, `Detail`, `SignIn`, `Dashboard`, `Register`, `Docs`
- Routes: `/`, `/browse`, `/bundle/:id`, `/signin`, `/dashboard`, `/register`, `/docs`

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Publisher Import Pipeline** - Publishers can sign in, register repos, and produce stable snapshot data.
- [ ] **Phase 2: Great Bundle Pages + Safety + Downloads** - Visitors can confidently evaluate a bundle before installing it.
- [ ] **Phase 3: Discovery Browse** - Visitors can find bundles via cards, search, filters, and sorting.

## Phase Details

### Phase 1: Publisher Import Pipeline
**Goal**: Publishers can authenticate and publish bundles via a validated GitHub repo import that produces stable snapshot data.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, PUBL-01, PUBL-02, PUBL-03, PUBL-04, PUBL-05, PUBL-06
**Frontend context**: SignIn, Register, and Dashboard pages exist with static mock data. This phase wires them to a real backend (GitHub OAuth, repo validation API, import API).
**Success Criteria** (what must be TRUE):
  1. Publisher can sign in with GitHub OAuth and remains signed in after a browser refresh.
  2. Publisher can register a GitHub repo they control; invalid repo name or missing/invalid `opendots.yml` is rejected with a clear error.
  3. System imports bundle files and snapshots them; publisher can trigger a refresh and see success/failure plus the last imported commit + timestamp.
**Plans**: 3 plans in 3 waves

Plans:
- [ ] 01-01: Auth + session persistence (GitHub OAuth) — Wave 1
- [ ] 01-02: Repo registration + manifest/naming validation — Wave 2
- [ ] 01-03: Import + snapshot + manual refresh + import metadata — Wave 3

### Phase 2: Great Bundle Pages + Safety + Downloads
**Goal**: Visitors can understand bundle contents, see safety signals, and download/install the bundle in supported layouts.
**Depends on**: Phase 1
**Requirements**: BNDL-01, BNDL-02, BNDL-03, BNDL-04, BNDL-05, SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, SAFE-06, DL-01, DL-02, DL-03, DOCS-01
**Frontend context**: Detail page with CodeExplorer, safety notice, download cards, and Docs page exist with static content. This phase wires them to real bundle data, runs validation/scanning on import, and generates real ZIP downloads.
**Success Criteria** (what must be TRUE):
  1. Visitor can open a bundle detail page and see core metadata plus a link to the source GitHub repo.
  2. Visitor can inspect a file tree and preview files (with syntax highlighting where appropriate).
  3. Visitor can see validation results and prominent risk flags (including best-effort secret scan warnings) and understands the safety model ("user responsible").
  4. Visitor can download both Project ZIP and Global ZIP variants and follow clear install instructions for each.
  5. Visitor can read a docs/install guide explaining what bundles are, install destinations, and safety warnings.
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 02-01: Bundle detail page (file tree, previews, metadata, repo link) — Wave 1
- [ ] 02-02: Import-time validation + risk scanning + secret scanning — Wave 1
- [ ] 02-03: Safety display + ZIP downloads + install instructions + docs page — Wave 2

### Phase 3: Discovery Browse
**Goal**: Visitors can discover relevant bundles quickly using cards, search, filters, and sorting.
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08
**Frontend context**: Browse page with BundleCard grid, search input, filter checkboxes, and sort dropdown exist with static data. Home page shows recent bundle cards. This phase wires them to real bundle queries with server-side search/filter/sort.
**Success Criteria** (what must be TRUE):
  1. Visitor can browse bundles as cards showing name + summary, with a theme accent color when available (and a sensible fallback when missing).
  2. Visitor can search by text (name/summary/tags), filter by tag/artifact type/OpenCode compatibility, and see results update accordingly.
  3. Visitor can sort bundles (at least newest) and each card shows tags, risk badges, last updated, and GitHub stats.
**Plans**: 2 plans in 2 waves

Plans:
- [ ] 03-01: Browse page cards + listing API + accent color + Home page — Wave 1
- [ ] 03-02: Search/filter/sort controls + URL-driven state — Wave 2

## Progress

**Execution Order:**
Phases execute in numeric order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Publisher Import Pipeline | 0/3 | Planned | - |
| 2. Great Bundle Pages + Safety + Downloads | 0/3 | Planned | - |
| 3. Discovery Browse | 0/2 | Planned | - |
