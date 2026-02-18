import type { IncomingMessage, ServerResponse } from 'node:http'

type FastifyLike = {
  // Fastify's `ready()` resolves to the instance, but we keep the type loose
  // because Vercel typechecks this file without backend tsconfig.
  ready: () => any
  server: {
    emit: (event: 'request', req: IncomingMessage, res: ServerResponse) => void
  }
}

let serverPromise: Promise<FastifyLike> | null = null

async function getServer() {
  if (!serverPromise) {
    // NOTE: Vercel transpiles this handler to CommonJS.
    // The backend package is ESM (backend/package.json has "type": "module"),
    // so we must load it via dynamic import() to avoid ERR_REQUIRE_ESM.
    const { buildServer } = await import('../backend/src/app.js')
    serverPromise = buildServer()
  }
  return serverPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel Functions (non-Next.js) do not support catch-all routes like
  // `api/[...path].ts`. We implement catch-all behavior via `vercel.json` rewrite
  // that rewrites `/api/<anything>` to `/api?__opendots_path=<anything>`.
  //
  // Reconstruct the original path so Fastify sees `/api/...`.
  if (req.url) {
    const url = new URL(req.url, 'http://localhost')
    const rewrittenPath = url.searchParams.get('__opendots_path')
    if (rewrittenPath) {
      url.searchParams.delete('__opendots_path')
      const rewritten = new URL(
        rewrittenPath.startsWith('/') ? `http://localhost${rewrittenPath}` : `http://localhost/${rewrittenPath}`,
      )
      const normalizedPath = rewritten.pathname.startsWith('/')
        ? rewritten.pathname.slice(1)
        : rewritten.pathname

      // Preserve query params that may be embedded in the rewritten path,
      // e.g. /api/bundles/:id/file?path=dir/file.md
      rewritten.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value)
      })

      url.pathname = `/api/${normalizedPath}`
      req.url = `${url.pathname}${url.search}`
    }
  }

  const app = await getServer()
  await app.ready()
  app.server.emit('request', req, res)
}
