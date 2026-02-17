OpenDots deployment notes (Vercel)

This repo contains two separate apps:

- `frontend/` (Vite + React) - website
- `backend/` (Fastify) - API, exported as a Vercel Serverless Function via `backend/api/[...path].ts`

Recommended topology

Option A (recommended): split domains

- Frontend: `https://opendots.me`
- Backend: `https://api.opendots.me`

Option B: single domain

- Frontend and backend under the same domain, with the backend mounted at `/api/*`

Backend (Vercel)

1) Create a Vercel project pointing at `backend/`.
2) Ensure the API entrypoint is `backend/api/[...path].ts`.
3) Set environment variables:

- Required:
  - `BETTER_AUTH_SECRET` (>= 32 bytes)
  - `BETTER_AUTH_BASE_URL` (backend origin)
  - `APP_BASE_URL` (frontend origin)
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`

- Optional (recommended for abuse resistance / serverless durability):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `TURNSTILE_SECRET_KEY`
  - `BLOB_READ_WRITE_TOKEN`
  - `CORS_ALLOWED_ORIGINS` (comma-separated allowlist)

Frontend (Vercel)

1) Create a Vercel project pointing at `frontend/`.
2) Set environment variables:

- Required (when using split domains):
  - `VITE_API_BASE_URL` (e.g. `https://api.opendots.me`)

- Optional:
  - `VITE_TURNSTILE_SITE_KEY` (enables adaptive captcha widget in the UI)
  - `VITE_SITE_BASE_URL` (only needed if UI must emit links for a different public origin)

Operational checks

- Auth:
  - GitHub OAuth app callback URL must point at the backend Better Auth callback path.
  - `BETTER_AUTH_BASE_URL` must match the backend origin the browser uses.
- Database:
  - Run `npm --prefix backend run db:migrate` locally against Turso when creating the DB.
- Snapshots:
  - If `BLOB_READ_WRITE_TOKEN` is set, snapshots upload to Vercel Blob and download to `/tmp` on demand.
  - If not set, snapshots are stored locally and are not durable on serverless.

Post-deploy smoke checks

1) API health

```bash
curl -fsS https://api.opendots.me/api/health
```

2) API list + detail + download

```bash
SMOKE_API_BASE="https://api.opendots.me" npm --prefix backend run smoke:api
```

3) Frontend loads and points to correct API

```bash
curl -I https://opendots.me
```
