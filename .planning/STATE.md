# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-13)

**Core value:** People can quickly find and confidently evaluate OpenCode bundles before installing them.

## Current Position

Phase: 2 of 3 complete — ready for Phase 3 (Discovery Browse)
Plan: All Phase 2 plans done (02-01 ✓, 02-02 ✓, 02-03 ✓)
Status: Phase 2 complete + real-world alignment fixes applied
Last activity: 2026-02-13 — Completed Phase 2 and aligned with real-world OpenCode repos

Progress: [███████░░░] 74%

## Planning Summary

| Phase | Plans | Waves | Status |
|-------|-------|-------|--------|
| 1. Publisher Import Pipeline | 3 | 3 (sequential) | ✓ Complete |
| 2. Great Bundle Pages + Safety + Downloads | 3 | 2 (02-01 ∥ 02-02, then 02-03) | ✓ Complete |
| 3. Discovery Browse | 2 | 2 (sequential) | Planned |

**Total: 8 plans across 3 phases (6 complete, 2 remaining)**

## Frontend Status

**Scaffolding:** Complete (all 7 pages + 4 reusable components)
**Stack:** Vite + React 19 + TypeScript + React Router + CSS Modules
**Location:** `frontend/`
**State:** Phases 1–2 wired. Auth, registration, imports, dashboard, bundle detail (file tree + syntax-highlighted previews), safety display (risk badges + disclaimer), download cards, docs page — all functional.
**Dev server:** `npm run dev` in `frontend/` (port 5173)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~10 min
- Total execution time: ~1 hour

**By Phase:**

| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1 | 3 of 3 | 25 min | ✓ |
| 2 | 3 of 3 | 40 min | ✓ |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Frontend delegated to external design tool, then componentized as Vite + React + TypeScript SPA
- CSS Modules chosen over Tailwind to preserve pixel-perfect fidelity with external design
- React Router (client-side SPA) chosen over Next.js/SSR — no SSR needed for v1
- Backend: Fastify + Better Auth (GitHub) + Drizzle + SQLite/libSQL (from Phase 1 research)
- **Better Auth instead of NextAuth/Clerk** - Simpler setup, built-in Drizzle adapter, no vendor lock-in (Plan 01-01)
- **Cookie-based sessions** - Better Auth built-in cookie management, simpler SPA integration (Plan 01-01)
- **Vite proxy for /api** - Eliminates CORS complexity in development (Plan 01-01)
- **Synchronous refresh in v1** - API waits for import completion; simpler than background jobs (Plan 01-03)
- **Local filesystem snapshot storage** - Store zips under backend/storage/snapshots; avoids cloud complexity (Plan 01-03)
- **25MB max zip + 60s timeout** - Prevents abuse and large repo imports (Plan 01-03)
- **Embedded schemas over fetched schemas** - Avoid network dependency; validate against embedded minimal schemas (Plan 02-02)
- **JSON text column for safety results** - Flexible storage without schema migrations (Plan 02-02)
- **Best-effort secret scanning with regex** - Simpler than gitleaks CLI for v1; explicit disclaimers (Plan 02-02)
- **Never block import on scan failures** - Always produce snapshot; safety results are metadata (Plan 02-02)
- **File index stored as JSON in DB** - Fast reads vs extracting on every request (Plan 02-01)
- **100KB max preview size** - Prevents browser performance issues with large files (Plan 02-01)
- **Streaming ZIPs with archiver** - On-demand streaming, no temp files (Plan 02-03)
- **Both ZIP variants preserve repo layout** - Real repos use root-level dirs, not `.opencode/` (Real-world fix)

### Real-World Alignment (Post-Phase 2)

After analyzing `remorses/opencode-config` (a real published OpenCode config repo), 6 wrong assumptions were fixed:

1. **Repo naming**: Relaxed from `opendots-<slug>` to any valid GitHub repo name
2. **Manifest**: Made optional — metadata derived from GitHub API when absent
3. **Directory structure**: Real repos use root-level dirs (`agent/`, `command/`, `plugins/`, `skills/`, `prompts/`, `scripts/`), not `.opencode/`
4. **Config schema**: Updated to match real `opencode.json` fields (`$schema`, `theme`, `model`, `provider`, `plugin`, `mcp`, `permission`, `agent`)
5. **Theme schema**: Fixed to flat color properties (`primary`, `secondary`, `accent`, `text`, `textMuted`, `background`)
6. **File kind taxonomy**: Expanded from 6 to 12 types (added `agent`, `command`, `plugin`, `tool`, `prompt`, `mode`)

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-13
Stopped at: Phase 2 fully complete, planning docs updated, ready for Phase 3
Resume: Begin Phase 3 planning (Discovery Browse) — 2 plans across 2 waves
