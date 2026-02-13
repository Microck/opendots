---
phase: 01-publisher-import-pipeline
plan: 02
subsystem: api
tags: drizzle, fastify, octokit, github-oauth, zod, react, typescript

# Dependency graph
requires:
  - phase: 01-publisher-import-pipeline
    provides: "Better Auth session management, GitHub OAuth integration, user database schema"
provides:
  - Publisher bundle database schema for tracking registered repositories
  - GitHub API client for repo verification and manifest fetching
  - Manifest validation using Zod schema
  - Authenticated API endpoints for bundle registration and listing
  - Frontend Register page wired to backend with error handling
affects:
  - 01-03: Bundle import pipeline will use registered bundle records
  - 02-01: Dashboard will display registered bundles for publishers

# Tech tracking
tech-stack:
  added: ["octokit", "js-yaml", "@types/js-yaml", "@types/better-sqlite3"]
  patterns:
    - Fastify plugin pattern for route organization
    - Structured error responses with code/message/field
    - Cookie-based authentication with credentials include
    - Zod schema validation for manifest parsing
    - Drizzle ORM with SQLite for data persistence
    - GitHub REST API integration via Octokit

key-files:
  created:
    - backend/src/db/schema/publisher.ts
    - backend/src/github/githubClient.ts
    - backend/src/import/manifest.ts
    - backend/src/routes/publisherBundles.ts
  modified:
    - backend/drizzle.config.ts
    - backend/src/server.ts
    - frontend/src/pages/Register.tsx
    - frontend/src/pages/Register.module.css

key-decisions:
  - "Used Octokit for GitHub API integration with rate limit handling"
  - "Implemented strict repo naming pattern validation (opendots-<slug>)"
  - "Stored manifest as JSON string for flexibility"
  - "Structured error responses with field-level context for clear UI feedback"
  - "Checked repo permissions (admin/maintain) before registration"

patterns-established:
  - "Route registration pattern: Create Fastify plugin, register in server.ts"
  - "Error response pattern: { code, message, field? } for client-side display"
  - "Manifest validation pattern: Zod schema with passthrough() for extensibility"
  - "Database foreign key pattern: references() with cascade delete for data integrity"

# Metrics
duration: 7min
completed: 2026-02-13T07:06:11Z
---

# Phase 01: Plan 02: Publisher Registration with GitHub OAuth and Manifest Validation Summary

**Authenticated GitHub repository registration with strict naming validation, opendots.yml manifest parsing, and clear error feedback**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-13T06:59:31Z
- **Completed:** 2026-02-13T07:06:11Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Publisher bundle database schema with foreign key to user table and unique constraint on publisher+repo
- GitHub API client using Octokit with rate limiting and error handling for repo info and file fetching
- Manifest validation using Zod schema supporting both opendots.yml and opendots.json formats
- POST /api/publisher/bundles endpoint with comprehensive validation:
  - Repo name regex: opendots-<slug>
  - GitHub ownership verification (admin/maintain permissions)
  - Manifest fetching and validation
  - Structured error responses
- GET /api/publisher/bundles endpoint listing publisher's registered bundles
- Register page UI with form state, error display, and success redirect

## Task Commits

Each task was committed atomically:

1. **Task 1: Add publisher bundle database schema** - `2b5ec51` (feat)
   - Created publisherBundle table with fields: id, publisherAccountId, githubOwner, githubRepo, githubFullName, githubRepoId, defaultBranch, repoHtmlUrl, manifestJson, status, createdAt, updatedAt
   - Added foreign key reference to user table
   - Updated drizzle.config.ts to include publisher schema
   - Generated and applied migration

2. **Task 2: Implement repo registration endpoint with naming + manifest validation** - `a05b2d8` (feat)
   - Created GitHub client helper with Octokit for repo info and file fetching
   - Implemented opendots.yml/JSON manifest validation using Zod schema
   - Added POST /api/publisher/bundles with validation:
     - Enforce opendots-<slug> naming pattern
     - Verify repo ownership via GitHub API (admin/maintain permissions)
     - Fetch and validate opendots.yml manifest from repo root
     - Return structured errors with code, message, field
   - Added GET /api/publisher/bundles to list publisher's registered bundles
   - Register publisherBundles route in server
   - Install dependencies: octokit, js-yaml, type definitions

3. **Task 3: Wire Register page to API with error handling** - `014f647` (feat)
   - Add state for repo input, loading, error, and success
   - Submit to POST /api/publisher/bundles with credentials include
   - Display backend error messages with field context
   - Show success message and redirect to dashboard after 2s
   - Disable button during loading and when input is empty
   - Add error and success message styles to Register.module.css

Plan metadata: N/A (will be committed separately)

## Files Created/Modified

- `backend/src/db/schema/publisher.ts` - Publisher bundle table with foreign key to user and status tracking
- `backend/src/github/githubClient.ts` - GitHub API client with Octokit, repo info fetching, file content retrieval
- `backend/src/import/manifest.ts` - Manifest parser and validator using Zod, supports YAML and JSON
- `backend/src/routes/publisherBundles.ts` - Authenticated endpoints for bundle registration and listing
- `backend/drizzle.config.ts` - Updated to include publisher schema
- `backend/src/server.ts` - Registered publisherBundles route
- `frontend/src/pages/Register.tsx` - Registration form with API integration and error display
- `frontend/src/pages/Register.module.css` - Added error and success message styles

## Decisions Made

- Used Octokit for GitHub API integration with rate limit handling
- Implemented strict repo naming pattern validation (opendots-<slug>) to enforce convention
- Stored manifest as JSON string for flexibility with future schema changes
- Structured error responses with field-level context for clear UI feedback
- Checked repo permissions (admin/maintain) before registration to ensure control
- Cookie-based authentication with credentials include for session persistence

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

None

## User Setup Required

None - no external service configuration required

## Next Phase Readiness

- Publisher registration infrastructure complete, ready for bundle import implementation
- Bundle records will be available for import pipeline in plan 03
- Frontend can display registration errors and redirect to dashboard on success

---
*Phase: 01-publisher-import-pipeline*
*Completed: 2026-02-13*
