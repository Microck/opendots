import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

export const healthRoute: FastifyPluginAsync = fp(async (fastify) => {
  fastify.get('/api/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}, {
  name: 'health-route',
});
