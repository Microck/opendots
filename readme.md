<p align="center">
  <img src="frontend/public/brand/opendots-logo.svg" width="100" alt="opendots logo">
</p>

<p align="center">discover, share, and verify opencode configuration bundles</p>

<p align="center">
  <a href="https://opendots.me">website</a> •
  <a href="https://github.com/microck/opendots">github</a>
</p>

<p align="center">
  <img src="frontend/public/brand/opendots-banner.jpg" width="800" alt="opendots interface">
</p>

## what is this

opendots is a registry for opencode configuration bundles. it lets you:

- browse community configs
- publish your own setup
- download and install bundles

## quick start

```bash
# install dependencies
npm install -c frontend
npm install -c backend

# run dev servers
npm run dev -c frontend  # localhost:5173
npm run dev -c backend   # localhost:8788
```

## project structure

```
frontend/     # react + vite + typescript
backend/      # fastify + drizzle + sqlite
```

## tech stack

- **frontend**: react 19, vite, motion, gsap
- **backend**: fastify 5, drizzle orm, better auth
- **database**: sqlite (dev) / turso (prod)
- **deployment**: vercel

## key features

- github oauth authentication
- bundle publishing with claim codes
- zip download and extraction
- file preview with syntax highlighting
- rate limiting and security headers

## environment variables

copy `.env.example` files in both `frontend/` and `backend/`, then fill in your values.

## publishing a bundle

1. sign in with github
2. create repo named `opendots-<username>`
3. add your config files
4. visit dashboard and click publish

or use the ai-first publish flow:

```
fetch and follow https://opendots.me/publish.md
```

## installing a bundle

```
fetch and follow https://opendots.me/install.md
bundle: https://opendots.me/bundle/<id>
```

## api

- `get /api/bundles` - list bundles
- `get /api/bundles/:id` - bundle details
- `get /api/bundles/:id/download` - download zip
- `post /api/publish/claim/start` - start claim
- `post /api/publish/claim/complete` - complete claim

## license

mit

## contact

contact@micr.dev
