import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/auth.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
});
