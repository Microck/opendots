import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from './auth.js';

export const fastifyAuthRoute: FastifyPluginAsync = fp(async (fastify, options) => {
  await fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else if (value !== undefined) {
          headers.append(key, String(value));
        }
      });

      const init: RequestInit = {
        method: request.method,
        headers,
      };

      if (request.body !== undefined && request.method !== 'GET' && request.method !== 'HEAD') {
        if (typeof request.body === 'string') {
          init.body = request.body;
        } else {
          init.body = JSON.stringify(request.body);
        }
      }

      const response = await auth.handler(new Request(url.toString(), init));
      reply.status(response.status);

      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });

      const bodyText = await response.text();
      return reply.send(bodyText.length > 0 ? bodyText : null);
    },
  });
}, {
  name: 'fastify-auth-route',
});
