# Phase 3: Discovery Browse - Research

**Researched:** 2026-02-13
**Domain:** Bundle discovery UX (browse cards + search/filter/sort) backed by snapshot/index data
**Confidence:** MEDIUM

<user_constraints>
## User Constraints

### Locked Decisions
- Frontend is a Vite + React 19 + TypeScript SPA using React Router + CSS Modules.
- Discovery features are Phase 3 only (do not implement search/filter earlier).

### Additional Constraints
- Budget constraint: free-tier friendly choices.
- Prefer local repo artifacts as primary source of truth.

### Deferred Ideas (OUT OF SCOPE)
- v2 community features (ratings, collections, etc.) are out of Phase 3 scope.
</user_constraints>

## Summary

Phase 3 "Discovery Browse" is primarily a **query + presentation** problem: the Browse and Home pages already exist with mock data and a `BundleCard` component, but the phase requires a real **bundle index** that supports server-driven search/filter/sort and provides enough fields to render cards (name/summary/tags/risk/updated/GitHub stats/accent color).

The planner should treat this phase as two coupled deliverables:
1) a **bundle index/query API** over the snapshot data produced in Phases 1+2, and
2) **frontend wiring** that syncs UI controls to query state (ideally in the URL via React Router search params), debounces text search, and renders cards consistently (including accent stripe fallback behavior).

**Primary recommendation:** make Browse state URL-driven (`useSearchParams`) and back it with a single `GET /api/bundles` endpoint that supports `q`, `tags`, `artifactTypes`, `opencodeVersion`, `sort`, and returns card-ready fields.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.0 | UI rendering | Already in repo; stable base |
| react-router-dom | ^7.13.0 | Routing + URL query state | Already in repo; `useSearchParams` is the cleanest way to keep Browse controls shareable/bookmarkable |
| CSS Modules | n/a | Styling | Repo-wide styling approach |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| URLSearchParams (web) | n/a | Build query strings | Always (avoid extra deps) |
| AbortController (web) | n/a | Cancel in-flight fetches | Always for debounced search to avoid race conditions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL-driven filters (`useSearchParams`) | Local-only component state | Local-only state is simpler but breaks share/back-forward expectations and makes it harder to reason about "current query" |
| Server-side search/filter/sort | Client-side filtering on full dataset | Client-side works only for tiny datasets; roadmap explicitly calls for server-side behavior and it avoids shipping the whole index to browsers |

**Installation:**

No new dependencies are required for Phase 3 if the backend provides a query endpoint.

## Architecture Patterns

### Recommended Project Structure (frontend)
This phase needs a place for "discovery" types + query parsing + API client calls.

```
frontend/src/
  api/
    bundles.ts            # fetchBundles(query) + types
  pages/
    Browse.tsx            # UI controls + grid + URL sync
  components/
    BundleCard.tsx        # card rendering (accent stripe, meta chips)
  hooks/
    useDebouncedValue.ts
  domain/
    bundles.ts            # Bundle summary types, enums, helpers
```

### Pattern 1: URL-driven query state with `useSearchParams`

**What:** Treat the URL query string as the source of truth for Browse controls (search, filters, sort). Use local component state only for controlled inputs (e.g., `q` text) and keep it synchronized for back/forward.

**When to use:** Always for Browse; it improves shareability and makes UI state reproducible.

**Example:**

```tsx
// Source: https://github.com/remix-run/react-router/blob/main/docs/api/hooks/useSearchParams.md
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Sort = "newest" | "stars";

export function useBrowseQuery() {
  const [searchParams, setSearchParams] = useSearchParams();

  const qFromUrl = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as Sort) ?? "newest";
  const tags = searchParams.getAll("tag");
  const artifactTypes = searchParams.getAll("type");
  const opencode = searchParams.get("opencode") ?? "";

  const query = useMemo(
    () => ({ q: qFromUrl, sort, tags, artifactTypes, opencode }),
    [qFromUrl, sort, tags, artifactTypes, opencode],
  );

  const setQuery = (next: Partial<typeof query>) => {
    setSearchParams(prev => {
      // update single-value params
      const q = next.q ?? qFromUrl;
      const sortNext = next.sort ?? sort;
      const opencodeNext = next.opencode ?? opencode;

      prev.set("q", q);
      prev.set("sort", sortNext);
      if (opencodeNext) prev.set("opencode", opencodeNext);
      else prev.delete("opencode");

      // multi-value params (replace, don't mutate in place)
      if (next.tags) {
        prev.delete("tag");
        next.tags.forEach(t => prev.append("tag", t));
      }
      if (next.artifactTypes) {
        prev.delete("type");
        next.artifactTypes.forEach(t => prev.append("type", t));
      }

      return prev;
    });
  };

  return { query, setQuery };
}

export function BrowseSearchBox() {
  const { query, setQuery } = useBrowseQuery();
  const [q, setQ] = useState(query.q);

  // Keep input in sync for back/forward
  useEffect(() => {
    setQ(query.q);
  }, [query.q]);

  return (
    <input
      value={q}
      onChange={(e) => {
        const next = e.currentTarget.value;
        setQ(next);
        setQuery({ q: next });
      }}
    />
  );
}
```

### Pattern 2: Debounced search + abortable fetch

**What:** Debounce the `q` term before fetching and abort the previous request when a new one starts.

**When to use:** Always when `q` triggers network requests.

**Example:**

```ts
// Source: local repo + standard web APIs (AbortController)
export async function fetchBundles(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Bundle query failed: ${res.status}`);
  return (await res.json()) as unknown;
}
```

### Anti-Patterns to Avoid
- **Client-only filtering over all bundles:** breaks roadmap "server-side search/filter/sort" and does not scale.
- **Not aborting in-flight queries:** leads to out-of-order responses that overwrite newer results.
- **Using display strings as filter ids:** e.g., "Themes" vs `themes`; store canonical ids and map to labels.
- **Treating "updated" as a string:** UI can display relative time, but sorting should be based on timestamps.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL query parsing/encoding for filters | Ad-hoc string splitting | `useSearchParams` + `URLSearchParams` | Correct handling for multi-values, back/forward, encoding |
| Request cancellation | "ignore stale responses" flags | `AbortController` | Prevents wasted work and race bugs |
| Fuzzy search in browser | Complex scoring/tokenization | Server-side search (FTS/trigram) | Keeps index central, avoids shipping full dataset |
| Relative time math | Custom "3h ago" builders sprinkled around | Central helper formatting `updatedAt` | Consistency + testability |

**Key insight:** Discovery UX becomes brittle when query state is duplicated (URL vs component state vs API state). Pick one source of truth (URL) and derive everything else.

## Common Pitfalls

### Pitfall 1: Filters "look selected" but don't affect results
**What goes wrong:** UI state is updated locally but API query params are not, or params use wrong keys (`tag` vs `tags`).
**Why it happens:** No single query object/type shared between UI and API.
**How to avoid:** Define a `BrowseQuery` type and a single `toSearchParams(query)` encoder used by the API client.
**Warning signs:** QA sees checkbox changes but the network request URL doesn't change.

### Pitfall 2: Sort uses "updated" display string
**What goes wrong:** Newest sort becomes incorrect because it sorts by `"3h ago"` strings.
**Why it happens:** Card models prioritize display strings too early.
**How to avoid:** API returns `updatedAt` (ISO datetime) and UI derives `updatedLabel`.
**Warning signs:** Items updated "1w ago" appear above "2h ago".

### Pitfall 3: Accent stripe missing / inconsistent
**What goes wrong:** Accent color isn't set because some bundles don't include themes.
**Why it happens:** Theme is optional and import pipeline may not always parse it.
**How to avoid:** Card model includes `accentColor?: string` + UI fallback constant (e.g., `var(--border-light)` or `var(--border-active)`).
**Warning signs:** Accent stripe disappears or renders as transparent.

### Pitfall 4: OpenCode compatibility filter is ill-defined
**What goes wrong:** Filter compares version strings lexicographically ("10" < "2").
**Why it happens:** Treating SemVer as a string.
**How to avoid:** Store compatibility as `minVersion` (and optionally `maxVersion`) and compare with a SemVer parser on the server.
**Warning signs:** Filtering for >= 1.10 returns wrong results.

## Code Examples

Verified patterns from official sources + local repo context.

### Multi-value filters in URL query

```tsx
// Source: https://context7.com/remix-run/react-router/llms.txt (useSearchParams examples)
import { useSearchParams } from "react-router-dom";

export function TagFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTags = searchParams.getAll("tag");

  const toggleTag = (tag: string) => {
    setSearchParams(prev => {
      const tags = prev.getAll("tag");
      prev.delete("tag");
      const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
      next.forEach(t => prev.append("tag", t));
      return prev;
    });
  };

  return null;
}
```

### Minimal card-ready API response shape

```ts
// Source: local repo requirements (DISC-01..DISC-03) + Browse/Home mock data
export interface BundleCardDTO {
  id: string;
  name: string;
  summary: string;
  tags: string[];
  artifactTypes: string[]; // e.g. ["themes","commands","skills"]
  riskBadges: string[]; // e.g. ["EXEC","SHELL","REMOTE"]
  accentColor?: string; // derived from theme primary color when present

  // GitHub stats
  stars: number;
  forks?: number;

  // sorting + display
  updatedAt: string; // ISO datetime
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local-only filter state in React | URL-driven state (`useSearchParams`) | React Router v6+ (continues in v7) | Bookmark/shareable browse results, correct back/forward behavior |
| Client-side filtering over full dataset | Server-side query endpoint + indexed search | Standard for discovery pages | Scales; avoids shipping full index |
| Display-first timestamps | Raw timestamps + derived labels | Common modern practice | Correct sorting + consistent UI |

**Deprecated/outdated:**
- Treating SemVer as a plain string for comparisons (breaks compat filtering).

## Open Questions

1. **What is the canonical "bundle updated" timestamp?**
   - What we know: UI mock uses `updated` string and roadmap wants "last updated".
   - What's unclear: use GitHub pushed_at vs import snapshot timestamp vs manifest updated field.
   - Recommendation: define `updatedAt = snapshotImportedAt` for "newest" sort (stable and portal-controlled) and optionally include `repoPushedAt` as extra metadata.

2. **What exact artifact type taxonomy should Browse filter use?**
   - What we know: `.planning/frontend-prompt.md` lists themes/commands/agents/modes/skills/plugins/tools/rules/config.
   - What's unclear: do we collapse synonyms (tools vs custom tools) and do we treat "config" as presence of `opencode.json(c)`?
   - Recommendation: use canonical ids aligned to OpenCode directory names and map UI labels separately.

3. **Where do GitHub stats come from in v1?**
   - What we know: Browse cards should show stars/forks.
   - What's unclear: will Phase 1 importer fetch GitHub API, or will stats be optional.
   - Recommendation: treat stars/forks as snapshot fields captured at import time; do not fetch from the browser (rate limits, inconsistent UX).

## Sources

### Primary (HIGH confidence)
- Local: `.planning/ROADMAP.md` (Phase 3 goals + success criteria)
- Local: `.planning/REQUIREMENTS.md` (DISC-01..DISC-08)
- Local: `.planning/PROJECT.md` (frontend stack + constraints)
- Local: `.planning/frontend-prompt.md` (Browse page card fields + filter UX)
- Local: `frontend/src/pages/Browse.tsx` (existing controls and mock filtering)
- Local: `frontend/src/components/BundleCard.tsx` (current card model)
- Context7: `/remix-run/react-router` (useSearchParams behavior + examples)

### Secondary (MEDIUM confidence)
- Local: `deep-research-report (1).md` (facet ideas: artifact types, risk concepts; broader portal model)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions and stack are in `frontend/package.json`.
- Architecture: MEDIUM - frontend patterns are clear; backend query/index details depend on Phase 1/2 implementation choices not yet present in repo.
- Pitfalls: MEDIUM - common UI/query pitfalls; need validation once backend exists.

**Research date:** 2026-02-13
**Valid until:** 2026-03-15
