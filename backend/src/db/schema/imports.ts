import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { publisherBundle } from './publisher';

export const importRun = sqliteTable('import_run', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bundleId: text('bundleId').notNull().references(() => publisherBundle.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  startedAt: integer('startedAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
  finishedAt: integer('finishedAt', { mode: 'timestamp' }),
  commitSha: text('commitSha').notNull(),
  errorCode: text('errorCode'),
  errorMessage: text('errorMessage'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
});

export const snapshot = sqliteTable('snapshot', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  bundleId: text('bundleId').notNull().references(() => publisherBundle.id, { onDelete: 'cascade' }),
  commitSha: text('commitSha').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
  storagePath: text('storagePath').notNull(),
  byteSize: integer('byteSize').notNull(),
  fileIndex: text('fileIndex'),
}, (table) => ({
  uniqueIdx: uniqueIndex('snapshot_bundle_commit_idx').on(table.bundleId, table.commitSha),
}));
