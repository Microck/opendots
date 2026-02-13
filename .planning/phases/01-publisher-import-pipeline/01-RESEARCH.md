# Phase 1: Publisher Import Pipeline - Research

**Researched:** 2026-02-13
**Domain:** GitHub OAuth + repo import + snapshot storage (SPA backend integration)
**Confidence:** MEDIUM

## User Constraints

- Frontend is a Vite + React 19 + TypeScript SPA using React Router + CSS Modules.
- Publishing is GitHub OAuth + repo import; enforce repo name `opendots-<slug>` and require `opendots.yml`.
- Manual refresh only (no webhooks) in v1.
- Best-effort scanning + prominent warnings (no “safety guarantee”).
- Budget constraint: free-tier friendly choices.
- No backend exists yet.

## Summary

Phase 1 is mostly a backend bootstrap: implement GitHub OAuth with a persistent session (cookie-based), then add a repo registration + validation endpoint that proves control of the repo and verifies `opendots.yml`. Finally, implement a manual “import/refresh” pipeline that captures a stable snapshot keyed by commit SHA and stores import metadata (status, errors, last commit, timestamp) so the SPA can render Dashboard state reliably without live GitHub fetches.

The key planning decision is the backend “standard stack” because it determines how OAuth, sessions, and DB persistence work. Given the free-tier constraint and TypeScript-first repo, the most straightforward approach is a single Node.js API (Fastify) with Better Auth (GitHub provider) and a small SQL database (SQLite/libSQL via Drizzle). This gives durable sessions, a simple `/api/auth/session` check for “persist across refresh”, and a place to store repos, imports, and snapshots.

**Primary recommendation:** Use `Fastify + better-auth (GitHub) + Drizzle + SQLite/libSQL` and implement import as “create ImportRun record -> fetch repo@HEAD -> validate -> snapshot -> finalize status”, exposing status via a polling-friendly API.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastify` | latest | HTTP API server | Fast + TypeScript-friendly; plugin ecosystem. |
| `better-auth` | latest (v1.x) | GitHub OAuth + sessions | Offloads OAuth/session edge cases; has Fastify integration docs. |
| `drizzle-orm` | latest | DB access layer | Type-safe SQL; supports SQLite + libSQL and works on low-cost infra. |
| SQLite/libSQL (Turso optional) | n/a | Persistent storage | Free-tier friendly; single-tenant friendly; can run local or hosted. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@octokit/rest` | latest | GitHub API client | Repo validation + content fetch (manifest + metadata). |
| `@octokit/plugin-throttling` | latest | Rate limit handling | Prevent secondary-rate-limit failures during import. |
| `yaml` | latest | Parse `opendots.yml` | YAML parsing with good support for YAML 1.2. |
| `zod` | latest | Validate manifest + request/response payloads | Strong TS inference + clear validation errors for UI. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Hand-rolled GitHub OAuth + cookie sessions | Easy to get wrong (CORS, cookie flags, callback state, CSRF). |
| SQLite/libSQL | Postgres (Neon/Supabase) | Better multi-instance story; more moving parts early. |
| GitHub zipball import | Git tree/blob reconstruction | Tree/blob is many requests + complexity; zipball is simpler but heavier payload. |

**Installation (backend):**
```bash
npm i fastify @fastify/cors better-auth drizzle-orm @octokit/rest @octokit/plugin-throttling yaml zod
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── src/
│   ├── auth/
│   │   └── auth.ts            # better-auth config (GitHub provider)
│   ├── db/
│   │   ├── db.ts              # drizzle connection
│   │   └── schema.ts          # tables (repos/imports/snapshots) + better-auth tables (generated)
│   ├── github/
│   │   └── githubClient.ts    # Octokit + throttling
│   ├── import/
│   │   ├── manifest.ts        # opendots.yml parse + zod validation
│   │   └── importer.ts        # core import pipeline
│   ├── routes/
│   │   ├── bundles.ts         # register repo, list bundles, refresh
│   │   └── health.ts
│   └── server.ts              # fastify bootstrap + CORS + better-auth handler
└── package.json

frontend/
└── (existing SPA)
```

### Pattern 1: Cookie Session for SPA
**What:** Backend sets an `HttpOnly` session cookie. Frontend checks session on app load and uses `fetch(..., { credentials: 'include' })`.
**When to use:** AUTH-02 (persist across refresh) + any protected publisher endpoints.
**Example:**
```ts
// Source: Better Auth Fastify integration docs (context7)
// https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/integrations/fastify.mdx
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { auth } from './auth/auth'

const app = Fastify({ logger: true })

app.register(fastifyCors, {
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
})

app.route({
  method: ['GET', 'POST'],
  url: '/api/auth/*',
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host}`)
    const headers = new Headers()
    for (const [k, v] of Object.entries(request.headers)) if (v) headers.append(k, String(v))
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    })
    const res = await auth.handler(req)
    reply.status(res.status)
    res.headers.forEach((value, key) => reply.header(key, value))
    reply.send(res.body ? await res.text() : null)
  },
})
```

### Pattern 2: Repo Registration as Validation Gate
**What:** `POST /api/bundles/register` verifies format + user control + `opendots.yml` presence/validity before persisting.
**When to use:** PUBL-01..PUBL-03.
**Example:**
```ts
// Source: YAML parse API (context7)
// https://github.com/eemeli/yaml/blob/main/docs/01_intro.md
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

const RepoSlug = z.string().regex(/^opendots-[a-z0-9]+(-[a-z0-9]+)*$/)
const Manifest = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  license: z.string().min(1),
}).passthrough()

export function parseAndValidateManifest(yamlText: string) {
  const raw = parseYaml(yamlText)
  return Manifest.parse(raw)
}
```

### Pattern 3: ImportRun State Machine
**What:** Track import as a record with `status: pending|success|failure`, `startedAt`, `finishedAt`, `commitSha`, `errorCode`, `errorMessage`.
**When to use:** PUBL-04..PUBL-06 and dashboard UX.
**Example state transitions:** `pending -> success` or `pending -> failure` (no silent retries in v1).

### Anti-Patterns to Avoid
- **SPA stores OAuth token:** OAuth tokens must stay server-side; use session cookie in browser.
- **Live GitHub fetch for browsing:** violates “stable snapshot” requirement; snapshot at commit and read from DB for UI.
- **Blocking refresh without status:** long imports need a durable ImportRun record so UI can show progress/errors.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub OAuth + sessions | Custom OAuth redirects + cookie/session layer | `better-auth` GitHub provider | Avoid subtle security + callback/CORS/cookie bugs. |
| YAML parsing | Regex/line parsing | `yaml` | YAML edge cases (types, indentation, comments). |
| GitHub API calls | Raw `fetch` everywhere | `@octokit/rest` (+ throttling) | Cleaner typing + consistent auth + rate-limit strategies. |
| Validation errors | Ad-hoc checks | `zod` | Consistent error reporting for UI. |

**Key insight:** This phase fails most often at “boring glue” (cookies/CORS/OAuth redirects and import error handling). Using standard libs reduces rework.

## Common Pitfalls

### Pitfall 1: Cookies don’t persist across refresh
**What goes wrong:** User signs in, but on page reload the SPA loses auth state.
**Why it happens:** Using in-memory state only, or missing `credentials: true` on CORS / `credentials: 'include'` in fetch.
**How to avoid:** Cookie-based session + `/api/auth/session` on app boot.
**Warning signs:** Works in same tab, fails after refresh; DevTools shows no session cookie sent.

### Pitfall 2: OAuth redirect URI mismatch
**What goes wrong:** GitHub OAuth fails on callback.
**Why it happens:** Callback URL in GitHub app settings differs from backend route or environment origin.
**How to avoid:** Treat callback URLs as config; verify locally and in deployment.
**Warning signs:** GitHub error pages about redirect_uri.

### Pitfall 3: “User controls repo” check is too weak
**What goes wrong:** User registers a repo they can read but not administer, or a fork.
**Why it happens:** Checking only that repo exists.
**How to avoid:** Use authenticated repo permission data and require at least `admin`/`maintain` (policy choice).
**Warning signs:** Refresh/import later fails due to permission changes.

### Pitfall 4: Import breaks on large/binary repos
**What goes wrong:** Timeouts, memory spikes, DB bloats.
**Why it happens:** Importing entire repo unbounded.
**How to avoid:** Define import allowlist + size caps; store only text files needed for browsing.
**Warning signs:** Imports take >30s; DB grows unexpectedly.

### Pitfall 5: GitHub API rate limiting during refresh
**What goes wrong:** Imports fail intermittently under repeated refresh.
**Why it happens:** Many content requests (tree/blob per file) or retry storms.
**How to avoid:** Prefer zipball for full snapshot or use throttling plugin; serialize imports per repo.
**Warning signs:** 403 with rate-limit headers; secondary rate limit errors.

## Code Examples

Verified patterns from authoritative sources:

### Better Auth GitHub provider
```ts
// Source: better-auth GitHub docs (context7)
// https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/authentication/github.mdx
import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
})
```

### Octokit throttling plugin
```ts
// Source: Octokit throttling plugin example (context7)
// https://context7.com/octokit/rest.js/llms.txt
import { Octokit } from '@octokit/rest'
import { throttling } from '@octokit/plugin-throttling'

const MyOctokit = Octokit.plugin(throttling)

export function createGitHubClient(token: string) {
  return new MyOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`)
        return retryCount < 2
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(`Secondary rate limit for ${options.method} ${options.url}`)
        return false
      },
    },
  })
}
```

### Drizzle + libSQL connection
```ts
// Source: Drizzle libSQL connect docs (context7)
// https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/connect-turso.mdx
import { drizzle } from 'drizzle-orm/libsql'

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SPA keeps auth in local state only | Session cookie + session endpoint check | n/a | Required for AUTH-02; avoids false “logged out” on refresh. |
| Import by many `git/blobs` calls | Import via `zipball`/`tarball` for full snapshot | n/a | Fewer API calls; simpler and more robust for typical repos. |

**Deprecated/outdated (treat cautiously):**
- Assuming GitHub OAuth tokens never expire; behavior differs between OAuth Apps vs GitHub Apps and may change. Implement reauth on 401 and store import failures clearly.

## Open Questions

1. **`opendots.yml` schema (fields + validation rules)**
   - What we know: It must exist at repo root and be “validated” (PUBL-03).
   - What's unclear: Required fields, slug source-of-truth (repo name vs manifest id), and whether tags/compat/license are mandatory.
   - Recommendation: Start with minimal required fields (`id`, `name`, `summary`, `license`) and allow unknown keys; add stricter schema in Phase 2 when bundle pages + downloads need more.

2. **Snapshot scope and size limits**
   - What we know: Must create “stable snapshot data” for browsing (PUBL-04).
   - What's unclear: Whether to snapshot entire repo or an allowlist subset; max bytes per snapshot.
   - Recommendation: Snapshot an allowlist (OpenCode artifact paths + `README*` + `LICENSE*`) with size caps; store a file tree and content hash for each file.

3. **"Controls repo" policy**
   - What we know: Publisher must register a repo they control (PUBL-01).
   - What's unclear: Minimum permission level that counts as “control”.
   - Recommendation: Require `admin` or `maintain` to register; document this in UI.

## Sources

### Primary (HIGH confidence)
- `better-auth` docs via Context7:
  - Fastify integration: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/integrations/fastify.mdx
  - GitHub provider config: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/authentication/github.mdx
  - Drizzle adapter: https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/adapters/drizzle.mdx
- `drizzle-orm` docs via Context7:
  - libSQL/Turso connection: https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/connect-turso.mdx
- `yaml` docs via Context7:
  - Parse API: https://github.com/eemeli/yaml/blob/main/docs/01_intro.md
- `@octokit/rest` docs via Context7:
  - Pagination + throttling examples: https://context7.com/octokit/rest.js/llms.txt

### Secondary (MEDIUM confidence)
- GitHub REST docs (via Perplexity summaries; verify during implementation):
  - Repository contents endpoint (`/contents/{path}`): https://docs.github.com/en/rest/repos/contents
  - Git trees/blobs: https://docs.github.com/en/rest/git
  - Rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

### Tertiary (LOW confidence)
- GitHub OAuth token lifetime details for OAuth Apps (conflicting/non-authoritative sources appeared). Treat as “may change”; implement robust reauth and clear errors.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified via Context7 docs for Better Auth + Fastify + Drizzle.
- Architecture: MEDIUM - patterns are standard, but exact `opendots.yml` schema + snapshot scope are not specified yet.
- Pitfalls: MEDIUM - based on common OAuth/import failure modes; should be validated during implementation.

**Research date:** 2026-02-13
**Valid until:** 2026-03-15
