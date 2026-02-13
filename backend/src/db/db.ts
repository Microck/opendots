import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/auth';

const dbPath = process.env.DATABASE_URL || 'file:./dev.db';
const db = new Database(dbPath);

export const dbInstance = drizzle(db, { schema });
