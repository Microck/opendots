import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as authSchema from './schema/auth';
import * as publisherSchema from './schema/publisher';
import * as importsSchema from './schema/imports';

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
