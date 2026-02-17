import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from '../auth/auth.js';

export const sessionRoute: FastifyPluginAsync = fp(async (fastify) => {
  fastify.get('/api/auth/session', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        return { signedIn: false, user: null };
      }

      return {
        signedIn: true,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      };
    } catch (error) {
      reply.code(500);
      return { error: 'Failed to check session' };
    }
  });
}, {
  name: 'session-route',
});
