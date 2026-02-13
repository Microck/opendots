import Fastify from 'fastify';
import { fastifyAuthRoute } from './auth/fastifyAuthRoute';
import { healthRoute } from './routes/health';
import { sessionRoute } from './routes/session';

const PORT = process.env.PORT || 8787;

async function buildServer() {
  const server = Fastify({
    logger: true,
  });

  await server.register(fastifyAuthRoute);
  await server.register(healthRoute);
  await server.register(sessionRoute);

  server.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', request.headers.origin || '*');
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  });

  return server;
}

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
