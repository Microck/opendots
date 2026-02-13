import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

export const publisherBundle = sqliteTable('publisher_bundle', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  publisherAccountId: text('publisherAccountId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  githubOwner: text('githubOwner').notNull(),
  githubRepo: text('githubRepo').notNull(),
  githubFullName: text('githubFullName').notNull(),
  githubRepoId: integer('githubRepoId'),
  defaultBranch: text('defaultBranch'),
  repoHtmlUrl: text('repoHtmlUrl'),
  manifestJson: text('manifestJson'),
  status: text('status').notNull().default('registered'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
});
