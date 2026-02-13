import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const publisherBundle = sqliteTable('publisher_bundle', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  publisherAccountId: text('publisherAccountId').notNull().references((): any => {
    const { user } = require('./auth');
    return user.id;
  }, { onDelete: 'cascade' }),
  githubOwner: text('githubOwner').notNull(),
  githubRepo: text('githubRepo').notNull(),
  githubFullName: text('githubFullName').notNull(),
  githubRepoId: integer('githubRepoId'),
  defaultBranch: text('defaultBranch'),
  repoHtmlUrl: text('repoHtmlUrl'),
  manifestJson: text('manifestJson'),
  status: text('status').notNull().$default('registered'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => Date.now()),
});
