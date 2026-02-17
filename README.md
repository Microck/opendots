<p align="center">
  <img src="frontend/public/brand/opendots-logo.svg" width="100" alt="opendots logo" />
</p>

<p align="center">opendots is a registry for opencode configuration bundles: browse, publish, download, and verify.</p>

<p align="center">
  <a href="https://opendots.me"><img alt="website" src="https://img.shields.io/badge/website-opendots.me-111111" /></a>
  <a href="https://github.com/microck/opendots/actions/workflows/ci.yml"><img alt="ci" src="https://github.com/microck/opendots/actions/workflows/ci.yml/badge.svg" /></a>
</p>

<p align="center">
  <img src="frontend/public/brand/opendots-banner.jpg" width="800" alt="opendots screenshot" />
</p>

## what is this

opendots is a small full-stack app:

- frontend: public website and ui for browsing bundles
- backend: api for auth, publishing, downloads, and previews

## architecture

```mermaid
flowchart lr
  user[browser] --> fe[frontend (vite + react)]
  fe -->|http| be[backend (fastify)]
  be --> db[(sqlite / turso)]
  be --> gh[github oauth]
  be --> blob[vercel blob (optional)]
```

## repo layout

```
frontend/  react + vite + typescript
backend/   fastify + typescript + drizzle
api/       vercel serverless function (mounts backend at /api/*)
```

## local dev

requirements: node 20+

```bash
npm --prefix frontend install
npm --prefix backend install

npm --prefix frontend run dev  # http://localhost:5173
npm --prefix backend run dev   # http://localhost:8788
```

## env

- copy `frontend/.env.example` to `frontend/.env`
- copy `backend/.env.example` to `backend/.env`

for prod env vars (github oauth, turso, optional upstash/turnstile/blob), see `DEPLOY.md`.

## api (selected)

- get `/api/health`
- get `/api/bundles`
- get `/api/bundles/:id`
- get `/api/bundles/:id/file`
- get `/api/bundles/:id/download`
- post `/api/publish/claim/start`
- post `/api/publish/claim/complete`
- get `/api/auth/session`
- all auth routes: `/api/auth/*`

## contact

contact@micr.dev
