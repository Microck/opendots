import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/auth.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./dev.db',
  },
});
