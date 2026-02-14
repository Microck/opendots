# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-14)

**Core value:** People can quickly find and confidently evaluate OpenCode bundles before installing them.
**Current focus:** v1.0 shipped — preparing next milestone

## Current Position

Phase: v1.0 complete
Plan: All complete
Status: Shipped
Last activity: 2026-02-14 - v1.0 milestone complete

Progress: [██████████] 100%

## Planning Summary

| Phase | Plans | Waves | Status |
|-------|-------|-------|--------|
| 1. Publisher Import Pipeline | 3 | 3 (sequential) | 01-01 ✓, 01-02 ✓, 01-03 ✓ |
| 2. Great Bundle Pages + Safety + Downloads | 3 | 2 (02-01 ∥ 02-02, then 02-03) | 02-01 ✓, 02-02 ✓, 02-03 ✓ |
| 3. Discovery Browse | 2 | 2 (sequential) | 03-01 ✓, 03-02 ✓ |
| 4. v1.0 Gap Closure | 2 | 2 (04-01 → 04-02) | 04-01 ✓, 04-02 ✓ |

**Total: 10 plans across 4 phases**

## Frontend Status

**Scaffolding:** Complete (all 7 pages + 4 reusable components)
**Stack:** Vite + React 19 + TypeScript + React Router + CSS Modules
**Location:** `frontend/`
**State:** All pages wired to real backend data. Browse and Home show live bundle cards. Detail page has file explorer, safety signals, and downloads.
**Dev server:** `npm run dev` in `frontend/` (port 5173)

## Backend Status

**Stack:** Fastify + Better Auth (GitHub OAuth) + Drizzle + SQLite
**API:** Port 8787
**Setup:** Requires GitHub OAuth environment variables (see backend/.env.example)

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Last plan duration: 7 min (03-02)
- Milestone duration: ~1 day

## Accumulated Context

### Decisions

All key decisions made during v1.0:

- Frontend delegated to external design tool, then componentized as Vite + React + TypeScript SPA
- CSS Modules chosen over Tailwind to preserve pixel-perfect fidelity with external design
- React Router (client-side SPA) chosen over Next.js/SSR - no SSR needed for v1
- Backend: Fastify + Better Auth (GitHub) + Drizzle + SQLite
- Better Auth instead of NextAuth/Clerk - simpler setup, built-in Drizzle adapter, no vendor lock-in
- Cookie-based sessions + Vite proxy for `/api` to keep SPA auth integration simple
- Import pipeline stores stable snapshots and never blocks import on safety scan failures
- Discovery API decision: `/api/bundles` returns an array of card-ready objects for direct Browse/Home rendering
- Discovery metadata decision: persist `accentColor` from theme primary color at import time with frontend fallback
- Discovery stats decision: persist stars/forks from GitHub on registration/refresh/import; do not live-fetch in the browser
- Discovery browse decision: search/filter/sort state is URL-driven via `useSearchParams` for shareable and back/forward-safe views
- Discovery browse decision: tag/type multi-select filters use repeated URL params with backend normalization support
- Discovery browse decision: text search updates are debounced and fetches are AbortController-cancellable to avoid stale responses

### Pending Todos

- None.

### Blockers/Concerns

- GitHub OAuth requires environment variables for live testing
- Manual UX verification pending for Phase 3

## Session Continuity

Last session: 2026-02-14
Stopped at: v1.0 milestone complete, archives created, git tagged

**What's next:** Start new milestone with `/gsd-new-milestone`
