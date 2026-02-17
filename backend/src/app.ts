import Fastify from 'fastify';

import { fastifyAuthRoute } from './auth/fastifyAuthRoute';
import { healthRoute } from './routes/health';
import { sessionRoute } from './routes/session';
import { publisherBundlesRoute } from './routes/publisherBundles';
import { publicBundlesRoute } from './routes/publicBundles';
import { publishClaimRoute } from './routes/publishClaim';

function buildAllowedOrigins() {
  const fromEnv = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const authBaseUrl = process.env.BETTER_AUTH_BASE_URL ? [process.env.BETTER_AUTH_BASE_URL] : [];
  const appBaseUrl = process.env.APP_BASE_URL ? [process.env.APP_BASE_URL] : [];

  const dev = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  return new Set([...authBaseUrl, ...appBaseUrl, ...dev, ...fromEnv]);
}

export async function buildServer() {
  const server = Fastify({ logger: true });
  const allowedOrigins = buildAllowedOrigins();

  await server.register(fastifyAuthRoute);
  await server.register(healthRoute);
  await server.register(sessionRoute);
  await server.register(publisherBundlesRoute);
  await server.register(publicBundlesRoute);
  await server.register(publishClaimRoute);

  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');

    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
      reply.header('Access-Control-Allow-Credentials', 'true');
    }

    reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,PATCH,DELETE');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

    if (request.method === 'OPTIONS') {
      reply.code(204);
      return reply.send();
    }
  });

  return server;
}
