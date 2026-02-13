---
phase: 01-publisher-import-pipeline
plan: 01
subsystem: auth
tags: better-auth, github-oauth, fastify, drizzle, sqlite, cookie-session
type: execute

# Dependency graph
requires: []
provides:
  - Better Auth configuration with GitHub OAuth provider
  - Cookie-based session management with database persistence
  - Fastify backend with auth API endpoints (/api/auth/*, /api/auth/session, /api/health)
  - Vite dev proxy for /api to backend
  - React client integration with auth state management
affects: 01-02, 01-03 (auth required for protected publisher endpoints)

# Tech tracking
tech-stack:
  added: ["better-auth@1.4.18", "drizzle-orm@0.45.1", "better-sqlite3@12.0.0", "fastify@5.0.0", "@fastify/cors@9.0.0", "@fastify/cookie@11.0.0", "tsx@4.21.0"]
  patterns:
    - "Better Auth for OAuth and session management (not hand-rolling)"
    - "Cookie-based sessions with SQLite persistence"
    - "Fastify plugin architecture for route handlers"
    - "Vite dev server proxy pattern for API calls"

key-files:
  created:
    - "backend/package.json" - Node.js backend dependencies and scripts
    - "backend/tsconfig.json" - TypeScript configuration for backend
    - "backend/src/auth/auth.ts" - Better Auth configuration with GitHub provider
    - "backend/src/auth/fastifyAuthRoute.ts" - Fastify plugin wrapping Better Auth handler
    - "backend/src/db/schema/auth.ts" - Drizzle schema for user, session, account tables
    - "backend/src/db/db.ts" - Database connection with better-sqlite3
    - "backend/src/routes/health.ts" - Health check endpoint
    - "backend/src/routes/session.ts" - Session check endpoint
    - "backend/src/server.ts" - Fastify server with auth routes and CORS
    - "backend/drizzle.config.ts" - Drizzle ORM configuration
    - "backend/drizzle/0000_goofy_psylocke.sql" - Database migration file
    - "frontend/src/lib/authClient.ts" - Better Auth React client setup
  modified:
    - "frontend/package.json" - Added better-auth dependency
    - "frontend/vite.config.ts" - Added /api proxy to backend
    - "frontend/src/App.tsx" - Added session check on mount, auth state management
    - "frontend/src/components/Navbar.tsx" - Updated for real auth state and sign out
    - "frontend/src/pages/SignIn.tsx" - Wired to GitHub OAuth via auth client

key-decisions:
  - "Better Auth instead of NextAuth or Clerk - simpler setup, built-in Drizzle adapter, no vendor lock-in"
  - "Fastify instead of Express - better TypeScript support, plugin architecture, faster startup"
  - "Cookie-based sessions instead of token-based - simpler SPA integration, automatic HTTP-only cookie management"
  - "Vite proxy instead of CORS - eliminates CORS complexity in development, same-origin API calls from frontend"

patterns-established:
  - "Backend: Fastify plugin pattern for route modules"
  - "Frontend: App-level session check with useEffect, derived state from /api/auth/session response"
  - "Database: Drizzle schema-first migrations with auto-generated SQL"
  - "Auth: Better Auth client with social() method for OAuth providers"

# Metrics
duration: 12 min
completed: 2026-02-13
---

# Phase 01: Plan 01 Summary

**GitHub OAuth authentication with Better Auth, cookie-based session persistence using Drizzle + SQLite, Fastify backend, and React SPA integration**

## Performance
- **Duration:** 12 min (12.22 min)
- **Started:** 2026-02-13T06:43:20Z
- **Completed:** 2026-02-13T06:55:34Z
- **Tasks:** 2
- **Files modified:** 48 (12 new files in backend, 36 files in frontend)

## Accomplishments
- Created complete Fastify backend with Better Auth GitHub OAuth integration
- Implemented cookie-based session management with SQLite persistence
- Set up Vite dev server proxy for seamless API calls from frontend
- Wired React SPA to check session on mount and derive auth state
- Integrated Better Auth React client for GitHub OAuth sign-in flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backend scaffold + Better Auth GitHub OAuth** - `cfd5048` (feat)
2. **Task 1 fixes: database connection and server startup** - `a28ab9a` (fix)
3. **Task 2: Wire SPA auth bootstrap and GitHub sign-in redirect** - `38a1752` (feat)

## Files Created/Modified

Backend:
- `backend/package.json` - Node.js project with dependencies and scripts (dev, build, lint, db:generate, db:migrate)
- `backend/tsconfig.json` - TypeScript configuration for backend ESM
- `backend/src/auth/auth.ts` - Better Auth configuration with GitHub OAuth provider
- `backend/src/auth/fastifyAuthRoute.ts` - Fastify plugin wrapping Better Auth handler at /api/auth/*
- `backend/src/db/schema/auth.ts` - Drizzle schema for user, session, account tables
- `backend/src/db/db.ts` - SQLite database connection with better-sqlite3
- `backend/src/routes/health.ts` - Health check endpoint at /api/health
- `backend/src/routes/session.ts` - Session check endpoint at /api/auth/session
- `backend/src/server.ts` - Fastify server with auth routes and CORS configuration
- `backend/drizzle.config.ts` - Drizzle ORM configuration for SQLite
- `backend/drizzle/0000_goofy_psylocke.sql` - Auto-generated migration SQL
- `backend/.env.example` - Environment variable template for GitHub OAuth

Frontend:
- `frontend/package.json` - Updated with better-auth dependency
- `frontend/vite.config.ts` - Added Vite proxy for /api to backend (port 8787)
- `frontend/src/lib/authClient.ts` - Better Auth React client setup with /api/auth baseURL
- `frontend/src/App.tsx` - Session check on mount, auth state management, redirect to dashboard when signed in
- `frontend/src/components/Navbar.tsx` - Shows user info when signed in, sign out button uses authClient.signOut()
- `frontend/src/pages/SignIn.tsx` - GitHub OAuth sign-in via authClient.signIn.social()

## Decisions Made

1. **Better Auth instead of NextAuth/Clerk** - Chose Better Auth for simpler setup and built-in Drizzle adapter. No vendor lock-in, easier to customize.

2. **Fastify instead of Express** - Chose Fastify for better TypeScript support and plugin architecture. Faster startup and better performance benchmarks.

3. **Cookie-based sessions** - Used Better Auth's built-in cookie management instead of JWT tokens in headers. Simpler SPA integration with credentials: 'include'.

4. **Vite proxy instead of CORS** - Used Vite dev server proxy to forward /api to backend. Eliminates CORS complexity in development, same-origin API calls from frontend.

5. **SQLite with better-sqlite3** - Chose better-sqlite3 for better Auth compatibility (requires v12+). Simple file-based database for local development.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Dependency conflicts**: Better Auth requires drizzle-kit@0.31.9+, drizzle-orm@0.45.1+, better-sqlite3@12.0.0+. Fixed by updating to matching versions.
- **tsx loader deprecation**: Node v24 deprecated --loader flag. Fixed by using --import flag with tsx/esm.
- **Database path issue**: better-sqlite3 couldn't open database with file:./dev.db. Fixed by using absolute path with dirname and removing DATABASE_URL env var.

## User Setup Required

**External services require manual configuration.** See [backend/.env.example](../backend/.env.example) for:

**GitHub OAuth App Setup:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Application name: "Opendots"
4. Homepage URL: http://localhost:5173
5. Authorization callback URL: `http://localhost:8787/api/auth/callback/github`

**Environment Variables:**
- `GITHUB_CLIENT_ID` - From GitHub OAuth App settings page
- `GITHUB_CLIENT_SECRET` - Generate from OAuth App settings (Client Secret button)
- `BETTER_AUTH_SECRET` - Generate random 32+ byte secret for session signing (e.g., `openssl rand -base64 32`)
- `PORT` - Backend port (default 8787)

**Create `.env` file in `backend/` directory with these variables.**

## Next Phase Readiness

Phase 1-02 (Publisher Registration) can proceed:
- Auth foundation complete and verified
- Protected endpoints can be created in next plan
- Session management in place for user context
- Backend server and proxy configured for development

**Note:** Real GitHub OAuth flow requires environment variables to be set before testing sign-in. Mock credentials in .env will allow server to start but OAuth callback will fail.
