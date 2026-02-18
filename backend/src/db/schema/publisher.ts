import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth.js';

export const publisherBundle = sqliteTable(
  'publisher_bundle',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    // Nullable to support publish-with-claim flow (bundle can be claimed after GitHub OAuth sign-in).
    publisherAccountId: text('publisherAccountId').references(() => user.id, { onDelete: 'cascade' }),
    githubOwner: text('githubOwner').notNull(),
    githubRepo: text('githubRepo').notNull(),
    githubFullName: text('githubFullName').notNull(),
    githubRepoId: integer('githubRepoId'),
    defaultBranch: text('defaultBranch'),
    repoHtmlUrl: text('repoHtmlUrl'),
    manifestJson: text('manifestJson'),
    accentColor: text('accentColor'),
    // Short public share code (5 chars, starts with digit). Nullable for legacy rows and backfills.
    shareCode: text('shareCode'),
    stars: integer('stars').notNull().default(0),
    forks: integer('forks').notNull().default(0),
    status: text('status').notNull().default('registered'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
  },
  (table) => ({
    githubFullNameUniqueIdx: uniqueIndex('publisher_bundle_github_full_name_unique_idx').on(table.githubFullName),
    shareCodeUniqueIdx: uniqueIndex('publisher_bundle_share_code_unique_idx').on(table.shareCode),
  })
);

export const publishClaim = sqliteTable(
  'publish_claim',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    repoFullName: text('repoFullName').notNull(),
    claimCode: text('claimCode').notNull(),
    claimFilePath: text('claimFilePath').notNull().default('opendots-claim.txt'),
    status: text('status').notNull().default('pending'),
    bundleId: text('bundleId').references(() => publisherBundle.id, { onDelete: 'set null' }),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => sql`(strftime('%s', 'now'))`),
    expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
    completedAt: integer('completedAt', { mode: 'timestamp' }),
  },
  (table) => ({
    repoIdx: index('publish_claim_repo_idx').on(table.repoFullName),
    codeIdx: index('publish_claim_code_idx').on(table.claimCode),
  })
);
