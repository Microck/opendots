import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';

export const fastifyAuthRoute: FastifyPluginAsync = fp(async (fastify, options) => {
  const authHandler = toNodeHandler(auth);

  await fastify.register(async function (fastify) {
    fastify.all('/api/auth/*', async (request, reply) => {
      return authHandler(request.raw, reply.raw);
    });
  });
}, {
  name: 'fastify-auth-route',
});
