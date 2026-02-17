import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { fileURLToPath } from 'node:url';

import * as authSchema from './schema/auth.js';
import * as publisherSchema from './schema/publisher.js';
import * as importsSchema from './schema/imports.js';

function getDatabaseConfig() {
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_CONNECTION_URL ||
    process.env.DATABASE_URL ||
    'file:./dev.db';

  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    undefined;

  return { url, authToken };
}

const connection = getDatabaseConfig();

export const libsqlClient = createClient({
  url: connection.url,
  authToken: connection.authToken,
});

export const dbSchema = {
  ...authSchema,
  ...publisherSchema,
  ...importsSchema,
};

export const dbInstance = drizzle({ client: libsqlClient, schema: dbSchema });

let migratePromise: Promise<void> | null = null;

export async function ensureDatabaseMigrated() {
  if (!migratePromise) {
    // `drizzle-turso` is the canonical migration folder for libsql/Turso.
    const migrationsFolder = fileURLToPath(new URL('../../drizzle-turso', import.meta.url));
    migratePromise = migrate(dbInstance, { migrationsFolder });
  }

  return migratePromise;
}
