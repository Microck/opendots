import type { IncomingMessage, ServerResponse } from 'node:http'
import { buildServer } from '../src/app'

let serverPromise: Promise<import('fastify').FastifyInstance> | null = null

async function getServer() {
  if (!serverPromise) {
    serverPromise = buildServer()
  }
  return serverPromise
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getServer()
  await app.ready()
  app.server.emit('request', req, res)
}
