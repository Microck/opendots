import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/db/schema/auth.ts',
    './src/db/schema/publisher.ts',
    './src/db/schema/imports.ts',
  ],
  out: './drizzle-turso',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || process.env.TURSO_CONNECTION_URL || process.env.DATABASE_URL || 'file:./dev.db',
    authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
  },
});
