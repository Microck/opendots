<p align="center">
  <a href="https://opendots.me">
    <img src="https://github.com/user-attachments/assets/61d056de-ff21-46b5-b7a2-225e6eddf535" width="100" alt="opendots logo" />
  </a>
</p>

<p align="center">opendots is a public directory for opencode configuration bundles.</p>

<p align="center">
  <a href="https://opendots.me"><img alt="website" src="https://img.shields.io/badge/website-opendots.me-111111" /></a>
  <a href="https://opendots.me/docs"><img alt="docs" src="https://img.shields.io/badge/docs-opendots.me%2Fdocs-111111" /></a>
</p>

<p align="center">
  <img src="frontend/public/brand/opendots-banner.jpg" width="800" alt="opendots screenshot" />
</p>

---

## overview

opendots is a place to find and share opencode configs without copy-pasting random dotfiles.

it focuses on two things:

- discovery: browse bundles and quickly see what they contain
- trust: preview files before you download, with basic safety signals

## quick links

- website: https://opendots.me
- browse: https://opendots.me/browse
- docs: https://opendots.me/docs
- publish: https://opendots.me/publish.md
- install: https://opendots.me/install.md
- terms: https://opendots.me/terms.md
- privacy: https://opendots.me/privacy.md
- github: https://github.com/microck/opendots

## architecture

```mermaid
flowchart lr
  u[browser] --> site[opendots ui]
  u -->|/api/*| fn[vercel function]
  fn --> app[fastify app]
  app --> db[(database)]
  app --> gh[github api + oauth]
  app --> snap[snapshot storage]
```

publish flow:

- connect github
- register a repo
- opendots imports a snapshot and runs lightweight validation/scans

browse flow:

- list bundles
- open a bundle page
- preview files and download a zip

## repo layout

```
frontend/  web ui
backend/   api implementation
api/       vercel function entrypoint (mounts backend at /api/*)
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

## features

- bundle pages with file tree + readable previews
- downloads for project or global install layouts
- github oauth for publishers
- repo import with snapshots (stable browsing without live github fetches)
- basic safety signals (best-effort scanning, not a guarantee)

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
