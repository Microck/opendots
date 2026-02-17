import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/db/schema/auth.ts', './src/db/schema/publisher.ts', './src/db/schema/imports.ts'],
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./dev.db',
  },
});
