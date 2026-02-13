# Phase 2: Great Bundle Pages + Safety + Downloads - Research

**Researched:** 2026-02-13
**Domain:** Bundle detail UX, safety signaling, validation/scanning, ZIP download generation
**Confidence:** MEDIUM

## User Constraints

- Locked decisions to honor:
  - Frontend is a Vite + React 19 + TypeScript SPA using React Router + CSS Modules.
  - Scanning is best-effort; messaging must make “user responsible” clear.
- Budget: free-tier friendly choices (OSS deps, avoid paid APIs).
- Repo context: `frontend/` already has `Detail` + `Docs` pages and `CodeExplorer` component using static mock data.

## Summary

Phase 2 is mostly about turning the existing static Detail + Docs UI into a trustworthy “inspection + install” flow. The key planning trick is to treat the bundle detail experience as three separate data products:

1) **Metadata + file tree** (fast, always available), 2) **file previews** (lazy-loaded per file, size-limited), and 3) **safety outputs** (validation results + risk flags + best-effort secret scan findings) generated server-side at import time.

Downloads should be produced by the backend as **two deterministic ZIP variants** (Project vs Global layout). Avoid client-side zipping; it’s slower, memory heavy, and introduces security footguns (path handling, zip-slip checks). Zip generation can be done on demand as a stream or pre-generated during import; both are free-tier friendly if you keep artifact sizes small and enforce limits.

**Primary recommendation:** plan Phase 2 around a small set of public read APIs (`bundle detail`, `file content`, `download zip`) backed by import-time analysis (Ajv schema validation, frontmatter rules, heuristic risk flags, best-effort secret scan).

## Standard Stack

### Core
| Area | Library | Version | Purpose | Why Standard |
|------|---------|---------|---------|--------------|
| Frontend routing | `react-router-dom` | ^7.13.0 (in repo) | Detail route `/bundle/:id` data wiring | Already chosen + supports loader-based data fetching |
| Backend API (recommended) | `fastify` | latest stable | Public read endpoints + streaming downloads | Small, fast, TS-friendly, streaming support |
| JSON Schema validation | `ajv` | v8.17.1 | Validate `opencode.json*` + theme JSON via JSON Schema | De-facto standard, fast, mature |
| ZIP generation | `archiver` | latest stable | Stream ZIP downloads from server | Standard streaming ZIP library |
| Frontmatter parsing | `gray-matter` | latest stable | Parse `SKILL.md` YAML frontmatter | Very common for markdown frontmatter |

### Supporting
| Area | Library | Version | Purpose | When to Use |
|------|---------|---------|---------|-------------|
| API response validation | `zod` | v3.24.2 (or v4.0.1) | Validate API payloads at boundaries (server + client) | When stabilizing API contracts / guarding against malformed data |
| Code highlighting | `prism-react-renderer` | latest stable | Syntax-highlight code previews in CodeExplorer | When previewing JS/TS/JSON/YAML/MD etc. |
| Markdown preview | `react-markdown` + `remark-gfm` | latest stable | Render markdown files in previews (README, SKILL.md, commands) | When you want a readable markdown preview (keep raw HTML disabled) |
| JSON-with-comments parsing | `comment-json` | latest stable | Parse `opencode.jsonc` if you need JSONC parsing in Node | When importer stores JSONC verbatim but you must validate/inspect it |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `prism-react-renderer` | `react-syntax-highlighter` | Easier API but often heavier bundle; both OK |
| Streaming ZIP on demand | Pre-generate ZIP on import + store on disk/object storage | Pre-gen reduces request CPU but needs storage; on-demand reduces storage but adds runtime CPU |
| Embedded secret scanner library | `gitleaks` CLI via subprocess | CLI is more proven; embedding is simpler deploy-wise only if the lib is maintained |

**Installation (frontend additions):**
```bash
cd frontend && npm install zod prism-react-renderer react-markdown remark-gfm
```

**Installation (backend additions; if Phase 1 doesn’t already define backend deps):**
```bash
npm install fastify ajv archiver gray-matter comment-json
```

## Architecture Patterns

### Recommended Data Model (Phase 2 consumption)

Assume Phase 1 produces a “snapshot” that Phase 2 reads without live GitHub fetching.

Minimum shape Phase 2 needs:

- `Bundle`
  - identity: `id`, `slug`, `name`, `summary`, `version`
  - provenance: `sourceRepoUrl`, `lastImportCommit`, `lastImportAt`
  - metadata: `license`, `tags`, `opencodeCompat`
  - computed safety summary: `riskFlags[]`, `validationSummary`, `secretScanSummary`
  - file index: `files[]` (path, size, kind, sha256, isBinary?, previewable?)

### Public API Surface (keep it tiny)

1) `GET /api/bundles/:id`
- Returns bundle metadata + file index + safety summaries + download endpoints.

2) `GET /api/bundles/:id/file?path=...`
- Returns file content (text) for preview; enforce max size + allowlist previewable types.

3) `GET /api/bundles/:id/download?variant=project|global`
- Streams ZIP with `Content-Disposition` + stable naming.

### Frontend Integration Pattern

You can keep the current `<Routes>` structure and fetch inside `Detail.tsx`, but React Router v7 supports Data Routers which simplify loading + cancellation.

Recommended (if you accept a router refactor during Phase 2): migrate `frontend/src/main.tsx` to `createBrowserRouter` + `RouterProvider`, and add a loader for bundle detail.

Example (React Router loader + cancellation):
```tsx
// Source: https://github.com/remix-run/react-router/blob/main/docs/start/data/custom.md
import { createBrowserRouter } from "react-router";

const router = createBrowserRouter([
  {
    path: "/bundle/:id",
    loader: ({ request, params }) =>
      fetch(`/api/bundles/${params.id}`, { signal: request.signal }).then((r) => r.json()),
    Component: Detail,
  },
]);
```

If you don’t refactor routes in Phase 2: implement a thin `api.ts` + `useEffect` fetch with an `AbortController` and keep the change localized.

### Validation/Scanning Pipeline Pattern (import-time)

Plan Phase 2 so safety outputs are generated when importing (Phase 1), not at page-render time.

Recommended steps per import:

1) Build file index (paths, sizes, hashes) + detect “kinds” (config/theme/skill/plugin/tool/etc.)
2) Validate:
   - `opencode.json/opencode.jsonc` against `https://opencode.ai/config.json` (SAFE-01)
   - theme JSON against `https://opencode.ai/theme.json` (SAFE-02)
   - `SKILL.md` frontmatter rules (SAFE-03)
3) Risk flags (SAFE-04): heuristics over file paths + content markers
4) Best-effort secret scan (SAFE-05): CLI tool or limited pattern scan; store “warnings”, not guarantees
5) Persist results to snapshot for stable UI rendering

## Don't Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | custom validators for config/theme | `ajv` | JSON Schema has many edge cases; Ajv is fast + correct |
| Markdown frontmatter parsing | manual YAML slicing | `gray-matter` | Handles real-world YAML frontmatter reliably |
| ZIP creation | ad-hoc zip writer in JS | `archiver` | Streaming ZIP is tricky; archiver is proven |
| Syntax highlighting | regex-based token coloring | `prism-react-renderer` or similar | Language tokenization is hard; Prism ecosystem is standard |
| Secret scanning engine | your own entropy+regex engine | `gitleaks` (preferred) or a maintained scanner | Secret scanning has constant churn; best-effort still benefits from known rules |

**Key insight:** “best-effort” scanning is still risky to DIY; the goal is predictable warnings with clear disclaimers, not catching everything.

## Common Pitfalls

### Pitfall 1: Rendering untrusted content unsafely (XSS)
**What goes wrong:** Bundle markdown/code previews execute scripts or inject unsafe HTML.
**Why it happens:** markdown renderers can allow raw HTML; preview APIs may return HTML.
**How to avoid:** treat all file content as untrusted; render code as text; for markdown use `react-markdown` with `skipHtml` (default to disallow raw HTML).
**Warning signs:** `<script>` or `<img onerror=...>` appearing in previews.

Example (skip HTML in markdown):
```tsx
// Source: https://context7.com/remarkjs/react-markdown/llms.txt
import Markdown from 'react-markdown'

<Markdown skipHtml>{markdownString}</Markdown>
```

### Pitfall 2: Slow/unstable Detail page due to loading all file contents
**What goes wrong:** Huge payloads and slow renders.
**Why it happens:** API returns file contents for entire tree.
**How to avoid:** return only file index in bundle detail; lazy-load content per selected file; hard cap preview size.
**Warning signs:** multi-MB JSON payloads; long main-thread blocks when switching files.

### Pitfall 3: Zip Slip / path traversal in generated ZIPs
**What goes wrong:** ZIP entries contain `../` or absolute paths, causing unsafe extraction.
**Why it happens:** using imported paths directly as entry names.
**How to avoid:** normalize and validate all zip entry names; reject any path that escapes root; strip leading `/`.
**Warning signs:** snapshot contains weird paths; ZIP entries show `..` segments.

### Pitfall 4: “Safety guarantee” implied by UI
**What goes wrong:** UX copy implies bundles are safe/malware-free.
**Why it happens:** green badges without disclaimers; overconfident wording.
**How to avoid:** separate “validation” from “trust”; show best-effort warnings; include “user responsible” text prominently (SAFE-06).
**Warning signs:** copy like “safe”, “verified”, “signed” unless you truly implement those guarantees.

### Pitfall 5: Schema fetch brittleness
**What goes wrong:** importer can’t validate because schema URL is down; imports fail.
**Why it happens:** validating against remote schema without caching.
**How to avoid:** cache schemas with a TTL; treat schema fetch failures as WARN (not FAIL) if you still have snapshot content.
**Warning signs:** flaky imports tied to network.

## Code Examples

### Ajv: compile and validate JSON schema
```ts
// Source: https://github.com/ajv-validator/ajv/blob/master/docs/guide/typescript.md
import Ajv, { JSONSchemaType } from 'ajv'

const ajv = new Ajv()

interface MyData {
  foo: number
  bar?: string
}

const schema: JSONSchemaType<MyData> = {
  type: 'object',
  properties: {
    foo: { type: 'integer' },
    bar: { type: 'string', nullable: true },
  },
  required: ['foo'],
  additionalProperties: false,
}

const validate = ajv.compile(schema)
if (!validate({ foo: 1 })) console.log(validate.errors)
```

### gray-matter: parse YAML frontmatter
```js
// Source: https://github.com/jonschlinkert/gray-matter/blob/master/README.md
const matter = require('gray-matter')
const parsed = matter('---\ntitle: Home\n---\nOther stuff')
// parsed.data, parsed.content
```

### archiver: stream a ZIP
```js
// Source: https://github.com/archiverjs/node-archiver/blob/master/README.md
import archiver from 'archiver'

const archive = archiver('zip', { zlib: { level: 9 } })
archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') throw err
})
archive.on('error', (err) => {
  throw err
})

reply.header('Content-Type', 'application/zip')
reply.header('Content-Disposition', 'attachment; filename="bundle.zip"')
reply.send(archive)

archive.append('hello', { name: 'README.txt' })
archive.finalize()
```

### Fastify: send a stream
```js
// Source: https://github.com/fastify/fastify/blob/main/docs/Reference/Reply.md
const fs = require('node:fs')

fastify.get('/streams', function (request, reply) {
  const stream = fs.createReadStream('some-file', 'utf8')
  reply.header('Content-Type', 'application/octet-stream')
  reply.send(stream)
})
```

### Zod: safeParse API responses
```ts
// Source: https://context7.com/colinhacks/zod/llms.txt
import { z } from 'zod'

const BundleSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const res = await fetch('/api/bundles/123')
const json = await res.json()
const parsed = BundleSchema.safeParse(json)
if (!parsed.success) throw parsed.error
```

### prism-react-renderer: highlighted preview
```tsx
// Source: https://github.com/formidablelabs/prism-react-renderer/blob/master/README.md
import { Highlight, themes } from 'prism-react-renderer'

<Highlight theme={themes.dracula} code={code} language="tsx">
  {({ style, tokens, getLineProps, getTokenProps }) => (
    <pre style={style}>
      {tokens.map((line, i) => (
        <div key={i} {...getLineProps({ line })}>
          {line.map((token, key) => (
            <span key={key} {...getTokenProps({ token })} />
          ))}
        </div>
      ))}
    </pre>
  )}
</Highlight>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` `<Routes>` only + `useEffect` fetching | React Router Data Routers with `loader` + `request.signal` | RR v6.4+; still present in v7 | Fewer race conditions; built-in cancellation; clearer data boundaries |
| “Download by building ZIP in browser” | Stream ZIP from server | long-standing | Lower memory usage; easier to enforce path rules |

**Deprecated/outdated:**
- Overconfident safety claims (“verified safe”) conflict with SAFE-06 and should be avoided.

## Open Questions

1. **Backend stack and storage are not yet defined in this repo.**
   - What we know: frontend exists; Phase 1 will import/snapshot data.
   - What’s unclear: where snapshot data is stored (DB vs filesystem vs object storage) and how downloads are served.
   - Recommendation: plan Phase 2 tasks assuming a simple HTTP API exists; implement ZIP generation as streaming first (no storage dependency), then optionally add caching.

2. **Secret scanning implementation choice.**
   - What we know: SAFE-05 is best-effort; no guarantees.
   - What’s unclear: whether you can ship a `gitleaks` binary in your deploy target.
   - Recommendation: prefer `gitleaks` CLI if deploy allows; otherwise implement a narrow regex-based warning set and label results as partial.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 2 goal + success criteria
- `.planning/REQUIREMENTS.md` - BNDL-01..05, SAFE-01..06, DL-01..03, DOCS-01
- `.planning/PROJECT.md` - frontend stack + constraints
- `frontend/src/pages/Detail.tsx` - existing detail UI structure
- `frontend/src/components/CodeExplorer.tsx` - existing code explorer component
- Ajv docs (Context7): /ajv-validator/ajv
- Archiver docs (Context7): /archiverjs/node-archiver
- React Router docs (Context7): /remix-run/react-router
- gray-matter docs (Context7): /jonschlinkert/gray-matter

### Secondary (MEDIUM confidence)
- OpenCode config schema URL and docs: https://opencode.ai/docs/config/ (via Perplexity)
- OpenCode theme schema URL and docs: https://opencode.ai/docs/themes/ (via Perplexity)
- OpenCode skills frontmatter rules: https://opencode.ai/docs/skills/ (via Perplexity)

### Tertiary (LOW confidence)
- Node secret scanning package claim: https://www.npmjs.com/package/@ziul285/gitleaks (via Perplexity; validate before adopting)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - frontend is known; backend choices are recommendations (repo doesn’t yet define backend)
- Architecture: MEDIUM - patterns are standard but depend on Phase 1 snapshot model
- Pitfalls: HIGH - XSS, payload size, zip-slip, and overclaiming safety are well-known failure modes

**Valid until:** 2026-03-15 (re-check OpenCode schema URLs + recommended libraries before implementation)
