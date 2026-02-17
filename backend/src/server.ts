import { buildServer } from './app';

const PORT = Number(process.env.PORT) || 8788;

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
