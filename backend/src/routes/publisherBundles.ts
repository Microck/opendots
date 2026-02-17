import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from '../auth/auth.js';
import { dbInstance as db } from '../db/db.js';
import { account } from '../db/schema/auth.js';
import { publisherBundle } from '../db/schema/publisher.js';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { createGitHubClient, getRepoInfo, getFileContent, getAuthenticatedUser, type GitHubRepoInfo } from '../github/githubClient.js';
import { fetchAndValidateManifest } from '../import/manifest.js';
import { importBundle, getLastImport } from '../import/importer.js';
import { importRun, snapshot } from '../db/schema/imports.js';
import type { FileIndexEntry } from '../import/fileIndex.js';

const REPO_NAME_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

function isUniqueConstraintError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return message.includes('unique constraint failed');
}

type DetectRepoStatus =
  | 'already_registered'
  | 'ready_to_publish'
  | 'repo_not_found'
  | 'repo_empty'
  | 'no_control';

interface GitHubContext {
  accessToken: string;
  login: string;
  octokit: ReturnType<typeof createGitHubClient>;
}

function isGitHubConnectivityError(error: any): boolean {
  const message = typeof error?.message === 'string' ? error.message : '';
  const code = error?.code ?? error?.cause?.code;
  const status = error?.status;

  if (code === 'EAI_AGAIN' || code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return true;
  }

  if (status === 500 && message.includes('api.github.com')) {
    return true;
  }

  return false;
}

async function getGitHubContext(userId: string): Promise<GitHubContext | null> {
  const githubAccounts = await db.select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, 'github')
      )
    )
    .limit(1);

  let selectedAccount: (typeof githubAccounts)[number] | undefined = githubAccounts[0];

  if (!selectedAccount) {
    const fallbackAccounts = await db.select()
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          isNull(account.providerId)
        )
      )
      .limit(5);

    selectedAccount = fallbackAccounts.find((candidate) => Boolean(candidate.accessToken));
  }

  if (!selectedAccount?.accessToken) {
    return null;
  }

  const accessToken = selectedAccount.accessToken;
  const octokit = createGitHubClient(accessToken);
  const githubUser = await getAuthenticatedUser(octokit);

  return {
    accessToken,
    login: githubUser.login,
    octokit,
  };
}

function parseRepoInput(repoInput: string): { owner: string; repo: string; fullName: string } | null {
  const githubUrlMatch = repoInput.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (githubUrlMatch) {
    const owner = githubUrlMatch[1];
    const repo = githubUrlMatch[2];
    return { owner, repo, fullName: `${owner}/${repo}` };
  }

  const parts = repoInput.split('/');
  if (parts.length !== 2) {
    return null;
  }

  const owner = parts[0].trim();
  const repo = parts[1].trim();
  if (!owner || !repo) {
    return null;
  }

  return { owner, repo, fullName: `${owner}/${repo}` };
}

async function findBundleByRepo(owner: string, repo: string) {
  const normalizedOwner = owner.toLowerCase();
  const normalizedRepo = repo.toLowerCase();

  const rows = await db.select()
    .from(publisherBundle)
    .where(
      and(
        sql`lower(${publisherBundle.githubOwner}) = ${normalizedOwner}`,
        sql`lower(${publisherBundle.githubRepo}) = ${normalizedRepo}`,
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

function prettifyRepoName(repo: string): string {
  return repo
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildSummaryFromFileIndex(fileIndex: FileIndexEntry[]): string {
  if (!fileIndex.length) {
    return 'Personal configuration files.';
  }

  const counts = new Map<FileIndexEntry['kind'], number>();
  for (const file of fileIndex) {
    counts.set(file.kind, (counts.get(file.kind) ?? 0) + 1);
  }

  const preferredKinds: FileIndexEntry['kind'][] = [
    'theme',
    'command',
    'agent',
    'skill',
    'plugin',
    'tool',
    'script',
    'config',
    'rules',
    'prompt',
    'mode',
  ];

  const highlights: string[] = [];
  for (const kind of preferredKinds) {
    const count = counts.get(kind) ?? 0;
    if (count <= 0) {
      continue;
    }

    highlights.push(pluralize(count, kind));
    if (highlights.length === 3) {
      break;
    }
  }

  const otherCount = counts.get('other') ?? 0;

  if (!highlights.length) {
    if (otherCount > 0) {
      return `Personal configuration files with ${pluralize(otherCount, 'misc file', 'misc files')}.`;
    }
    return `Personal configuration files (${pluralize(fileIndex.length, 'file')}).`;
  }

  const highlightsText =
    highlights.length === 1
      ? highlights[0]
      : `${highlights.slice(0, -1).join(', ')}, and ${highlights[highlights.length - 1]}`;

  if (otherCount > 0) {
    return `Personal config featuring ${highlightsText}, plus ${pluralize(otherCount, 'other file')}.`;
  }

  return `Personal config featuring ${highlightsText}.`;
}

function buildGeneratedManifest(params: {
  owner: string;
  repo: string;
  githubLogin: string;
  repoInfo: GitHubRepoInfo;
  fileIndex?: FileIndexEntry[];
}) {
  const { owner, repo, githubLogin, repoInfo, fileIndex } = params;
  const canonicalRepoName = `opendots-${githubLogin.toLowerCase()}`;

  const name = repo.toLowerCase() === canonicalRepoName
    ? `${githubLogin}'s config`
    : prettifyRepoName(repo);

  return {
    id: repo.toLowerCase(),
    name,
    summary: fileIndex?.length
      ? buildSummaryFromFileIndex(fileIndex)
      : (repoInfo.description?.trim() || 'Personal configuration files.'),
    license: repoInfo.license?.spdx_id || 'Unknown',
    sourceRepo: `${owner}/${repo}`,
    generatedBy: 'opendots-auto',
    generatedAt: new Date().toISOString(),
  };
}

function parseFileIndex(raw: string | null): FileIndexEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as FileIndexEntry[] : [];
  } catch {
    return [];
  }
}

function parseManifestJson(raw: string | null): Record<string, any> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
    return {};
  } catch {
    return {};
  }
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHexColor(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase();
}

function normalizeTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const tags = input
    .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
    .filter(Boolean)
    .slice(0, 10);

  const unique = Array.from(new Set(tags));
  return unique.filter((tag) => tag.length <= 24);
}

export const publisherBundlesRoute: FastifyPluginAsync = fp(async (fastify) => {
  fastify.get('/api/publisher/detect-repo', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      let githubContext: GitHubContext | null = null;
      try {
        githubContext = await getGitHubContext(session.user.id);
      } catch (error: any) {
        if (error?.status === 401) {
          reply.code(401);
          return {
            code: 'GITHUB_TOKEN_INVALID',
            message: 'GitHub authorization expired. Please sign in again.',
          };
        }
        throw error;
      }

      if (!githubContext) {
        reply.code(401);
        return {
          code: 'GITHUB_ACCOUNT_MISSING',
          message: 'GitHub account not linked',
        };
      }

      const expectedRepo = `opendots-${githubContext.login.toLowerCase()}`;
      const existingBundle = await findBundleByRepo(githubContext.login, expectedRepo);

      if (existingBundle) {
        // If this bundle was published via claim flow, attach it to the signed-in account now.
        if (!existingBundle.publisherAccountId) {
          try {
            const repoInfo = await getRepoInfo(githubContext.octokit, githubContext.login, expectedRepo);
            if (repoInfo && (repoInfo.permissions.admin || repoInfo.permissions.maintain || repoInfo.permissions.push)) {
              await db.update(publisherBundle)
                .set({ publisherAccountId: session.user.id, updatedAt: new Date() })
                .where(eq(publisherBundle.id, existingBundle.id));
              existingBundle.publisherAccountId = session.user.id;
            }
          } catch (claimError) {
            console.warn('Failed to auto-claim bundle:', claimError);
          }
        }

        return {
          status: 'already_registered' as DetectRepoStatus,
          githubLogin: githubContext.login,
          expectedRepo,
          bundle: {
            id: existingBundle.id,
            githubFullName: existingBundle.githubFullName,
            repoHtmlUrl: existingBundle.repoHtmlUrl,
          },
        };
      }

      const repoInfo = await getRepoInfo(githubContext.octokit, githubContext.login, expectedRepo);
      if (!repoInfo) {
        const createUrl = `https://github.com/new?name=${encodeURIComponent(expectedRepo)}&visibility=public`;
        return {
          status: 'repo_not_found' as DetectRepoStatus,
          githubLogin: githubContext.login,
          expectedRepo,
          createUrl,
          message: `Create ${expectedRepo} on GitHub to publish your config.`,
        };
      }

      if (!repoInfo.default_branch) {
        return {
          status: 'repo_empty' as DetectRepoStatus,
          githubLogin: githubContext.login,
          expectedRepo,
          repo: {
            fullName: repoInfo.full_name,
            htmlUrl: repoInfo.html_url,
            isPrivate: repoInfo.private,
          },
          message: 'Repository exists but has no commits yet.',
        };
      }

      if (!repoInfo.permissions.admin && !repoInfo.permissions.maintain && !repoInfo.permissions.push) {
        return {
          status: 'no_control' as DetectRepoStatus,
          githubLogin: githubContext.login,
          expectedRepo,
          repo: {
            fullName: repoInfo.full_name,
            htmlUrl: repoInfo.html_url,
            isPrivate: repoInfo.private,
          },
          message: 'You need write access to publish from this repository.',
        };
      }

      return {
        status: 'ready_to_publish' as DetectRepoStatus,
        githubLogin: githubContext.login,
        expectedRepo,
        repo: {
          fullName: repoInfo.full_name,
          htmlUrl: repoInfo.html_url,
          defaultBranch: repoInfo.default_branch,
          isPrivate: repoInfo.private,
        },
      };
    } catch (error) {
      console.error('Detect repo error:', error);

      if (isGitHubConnectivityError(error)) {
        reply.code(503);
        return {
          code: 'GITHUB_UNAVAILABLE',
          message: 'GitHub is temporarily unreachable. Please try again in a moment.',
        };
      }

      reply.code(500);
      return { error: 'Failed to detect repository' };
    }
  });

  fastify.get('/api/publisher/bundles', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      const bundles = await db.select()
        .from(publisherBundle)
        .where(eq(publisherBundle.publisherAccountId, session.user.id));

      const bundlesWithImport = await Promise.all(
        bundles.map(async (bundle) => {
          const lastImport = await getLastImport(bundle.id);
          return {
            ...bundle,
            lastImport: lastImport ? {
              id: lastImport.id,
              status: lastImport.status,
              commitSha: lastImport.commitSha,
              startedAt: lastImport.startedAt,
              finishedAt: lastImport.finishedAt,
              errorCode: lastImport.errorCode,
              errorMessage: lastImport.errorMessage,
            } : null,
          };
        })
      );

      return { bundles: bundlesWithImport };
    } catch (error) {
      reply.code(500);
      return { error: 'Failed to fetch bundles' };
    }
  });

  fastify.post('/api/publisher/bundles', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      const body = (request.body && typeof request.body === 'object'
        ? request.body
        : {}) as { repo?: unknown };
      const repoInput = typeof body.repo === 'string' ? body.repo.trim() : '';

      let githubContext: GitHubContext | null = null;
      try {
        githubContext = await getGitHubContext(session.user.id);
      } catch (error: any) {
        if (error?.status === 401) {
          reply.code(401);
          return {
            code: 'GITHUB_TOKEN_INVALID',
            message: 'GitHub authorization expired. Please sign in again.',
          };
        }
        throw error;
      }

      if (!githubContext) {
        reply.code(401);
        return { error: 'GitHub account not linked' };
      }

      let owner: string;
      let repo: string;
      let fullName: string;

      if (!repoInput) {
        owner = githubContext.login;
        repo = `opendots-${githubContext.login.toLowerCase()}`;
        fullName = `${owner}/${repo}`;
      } else {
        const parsedRepo = parseRepoInput(repoInput);
        if (!parsedRepo) {
          reply.code(400);
          return {
            code: 'INVALID_FORMAT',
            message: 'Repository must be in format "owner/repo" or a GitHub URL',
            field: 'repo',
          };
        }

        owner = parsedRepo.owner;
        repo = parsedRepo.repo;
        fullName = parsedRepo.fullName;
      }

      if (!REPO_NAME_REGEX.test(repo)) {
        reply.code(400);
        return {
          code: 'INVALID_REPO_NAME',
          message: 'Repository name contains invalid characters',
          field: 'repo',
        };
      }

      const octokit = githubContext.octokit;
      const repoInfo = await getRepoInfo(octokit, owner, repo);

      if (!repoInfo) {
        reply.code(404);
        return {
          code: 'REPO_NOT_FOUND',
          message: 'Repository not found or not accessible',
        };
      }

      if (!repoInfo.permissions.admin && !repoInfo.permissions.maintain && !repoInfo.permissions.push) {
        reply.code(403);
        return {
          code: 'NO_CONTROL',
          message: 'You must have write permissions on this repository',
        };
      }

      owner = repoInfo.owner.login;
      repo = repoInfo.name;
      fullName = repoInfo.full_name;

      const existingBundle = await findBundleByRepo(owner, repo);
      if (existingBundle) {
        if (existingBundle.publisherAccountId && existingBundle.publisherAccountId !== session.user.id) {
          reply.code(409);
          return {
            code: 'ALREADY_REGISTERED',
            message: 'This repository is already registered by another account',
          };
        }

        if (!existingBundle.publisherAccountId) {
          await db.update(publisherBundle)
            .set({ publisherAccountId: session.user.id, updatedAt: new Date() })
            .where(eq(publisherBundle.id, existingBundle.id));
        }

        const refreshResult = await importBundle(existingBundle.id, githubContext.accessToken);

        const latestBundleRows = await db.select()
          .from(publisherBundle)
          .where(eq(publisherBundle.id, existingBundle.id))
          .limit(1);

        return {
          bundle: latestBundleRows[0] ?? existingBundle,
          alreadyRegistered: true,
          importResult: refreshResult,
        };
      }

      const manifestResult = await fetchAndValidateManifest(
        async (o: string, r: string, path: string) => {
          return await getFileContent(octokit, o, r, path);
        },
        owner,
        repo
      );

      let manifest: any;
      let manifestSource: 'repository' | 'generated';
      if ('field' in manifestResult) {
        manifest = buildGeneratedManifest({
          owner,
          repo,
          githubLogin: githubContext.login,
          repoInfo,
        });
        manifestSource = 'generated';
      } else {
        manifest = manifestResult;
        manifestSource = 'repository';
      }

      let insertedBundle;
      try {
        insertedBundle = await db.insert(publisherBundle).values({
          publisherAccountId: session.user.id,
          githubOwner: owner,
          githubRepo: repo,
          githubFullName: fullName,
          githubRepoId: repoInfo.id,
          defaultBranch: repoInfo.default_branch,
          repoHtmlUrl: repoInfo.html_url,
          manifestJson: JSON.stringify(manifest),
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          status: 'registered',
        }).returning();
      } catch (insertError) {
        if (!isUniqueConstraintError(insertError)) {
          throw insertError;
        }

        const concurrentBundle = await findBundleByRepo(owner, repo);
        if (!concurrentBundle) {
          throw insertError;
        }

        if (concurrentBundle.publisherAccountId && concurrentBundle.publisherAccountId !== session.user.id) {
          reply.code(409);
          return {
            code: 'ALREADY_REGISTERED',
            message: 'This repository is already registered by another account',
          };
        }

        if (!concurrentBundle.publisherAccountId) {
          await db.update(publisherBundle)
            .set({ publisherAccountId: session.user.id, updatedAt: new Date() })
            .where(eq(publisherBundle.id, concurrentBundle.id));
        }

        const refreshResult = await importBundle(concurrentBundle.id, githubContext.accessToken);
        const latestBundleRows = await db.select()
          .from(publisherBundle)
          .where(eq(publisherBundle.id, concurrentBundle.id))
          .limit(1);

        return {
          bundle: latestBundleRows[0] ?? concurrentBundle,
          alreadyRegistered: true,
          importResult: refreshResult,
        };
      }

      const createdBundle = insertedBundle[0];
      const importResult = await importBundle(createdBundle.id, githubContext.accessToken);

      if (importResult.success && manifestSource === 'generated') {
        const latestSnapshot = await db.select()
          .from(snapshot)
          .where(and(
            eq(snapshot.bundleId, createdBundle.id),
            eq(snapshot.commitSha, importResult.commitSha || '')
          ))
          .orderBy(desc(snapshot.createdAt))
          .limit(1);

        const fileIndex = latestSnapshot[0] ? parseFileIndex(latestSnapshot[0].fileIndex) : [];
        const generatedManifest = buildGeneratedManifest({
          owner,
          repo,
          githubLogin: githubContext.login,
          repoInfo,
          fileIndex,
        });

        manifest = generatedManifest;

        await db.update(publisherBundle)
          .set({
            manifestJson: JSON.stringify(generatedManifest),
            updatedAt: new Date(),
          })
          .where(eq(publisherBundle.id, createdBundle.id));
      }

      const bundleWithLatestImport = await db.select()
        .from(publisherBundle)
        .where(eq(publisherBundle.id, createdBundle.id))
        .limit(1);

      const lastImport = await getLastImport(createdBundle.id);

      reply.code(201);
      return {
        bundle: bundleWithLatestImport[0] || createdBundle,
        alreadyRegistered: false,
        manifestSource,
        importResult,
        lastImport: lastImport ? {
          id: lastImport.id,
          status: lastImport.status,
          commitSha: lastImport.commitSha,
          startedAt: lastImport.startedAt,
          finishedAt: lastImport.finishedAt,
          errorCode: lastImport.errorCode,
          errorMessage: lastImport.errorMessage,
        } : null,
      };
    } catch (error: any) {
      console.error('Registration error:', error);

      if (isGitHubConnectivityError(error)) {
        reply.code(503);
        return {
          code: 'GITHUB_UNAVAILABLE',
          message: 'GitHub is temporarily unreachable. Please try again in a moment.',
        };
      }

      reply.code(500);
      return { error: 'Failed to register repository' };
    }
  });

  fastify.post('/api/publisher/bundles/:bundleId/refresh', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      const { bundleId } = request.params as { bundleId: string };

      const bundle = await db.select()
        .from(publisherBundle)
        .where(
          and(
            eq(publisherBundle.id, bundleId),
            eq(publisherBundle.publisherAccountId, session.user.id)
          )
        )
        .limit(1);

      if (!bundle || !bundle[0]) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const runningImport = await db.select()
        .from(importRun)
        .where(
          and(
            eq(importRun.bundleId, bundleId),
            eq(importRun.status, 'pending')
          )
        )
        .limit(1);

      if (runningImport.length > 0) {
        reply.code(409);
        return {
          error: 'CONFLICT',
          message: 'An import is already in progress for this bundle',
        };
      }

      let githubContext: GitHubContext | null = null;
      try {
        githubContext = await getGitHubContext(session.user.id);
      } catch (error: any) {
        if (error?.status === 401) {
          reply.code(401);
          return {
            code: 'GITHUB_TOKEN_INVALID',
            message: 'GitHub authorization expired. Please sign in again.',
          };
        }
        throw error;
      }

      if (!githubContext) {
        reply.code(401);
        return { error: 'GitHub account not linked' };
      }

      const octokit = githubContext.octokit;
      const latestRepoInfo = await getRepoInfo(
        octokit,
        bundle[0].githubOwner,
        bundle[0].githubRepo
      );

      if (latestRepoInfo) {
        await db.update(publisherBundle)
          .set({
            stars: latestRepoInfo.stargazers_count,
            forks: latestRepoInfo.forks_count,
            updatedAt: new Date(),
          })
          .where(eq(publisherBundle.id, bundleId));
      }

      const result = await importBundle(bundleId, githubContext.accessToken);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      const completedImport = await getLastImport(bundleId);

      reply.code(200);
      return {
        success: true,
        importRun: completedImport ? {
          id: completedImport.id,
          status: completedImport.status,
          commitSha: completedImport.commitSha,
          startedAt: completedImport.startedAt,
          finishedAt: completedImport.finishedAt,
          errorCode: completedImport.errorCode,
          errorMessage: completedImport.errorMessage,
        } : null,
      };
    } catch (error: any) {
      console.error('Refresh error:', error);

      if (isGitHubConnectivityError(error)) {
        reply.code(503);
        return {
          code: 'GITHUB_UNAVAILABLE',
          message: 'GitHub is temporarily unreachable. Please try again in a moment.',
        };
      }

      reply.code(500);
      return { error: 'Failed to refresh bundle' };
    }
  });

  fastify.patch('/api/publisher/bundles/:bundleId/metadata', async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        reply.code(401);
        return { error: 'Unauthorized' };
      }

      const { bundleId } = request.params as { bundleId: string };
      const body = (request.body ?? {}) as {
        name?: unknown;
        summary?: unknown;
        tags?: unknown;
        accentColor?: unknown;
        secondaryColor?: unknown;
      };

      const bundles = await db.select()
        .from(publisherBundle)
        .where(
          and(
            eq(publisherBundle.id, bundleId),
            eq(publisherBundle.publisherAccountId, session.user.id)
          )
        )
        .limit(1);

      if (!bundles[0]) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
      if (!name || name.length > 80) {
        reply.code(400);
        return {
          error: 'Invalid metadata',
          message: 'Name is required and must be at most 80 characters',
          field: 'name',
        };
      }

      if (!summary || summary.length > 280) {
        reply.code(400);
        return {
          error: 'Invalid metadata',
          message: 'Description is required and must be at most 280 characters',
          field: 'summary',
        };
      }

      const tags = normalizeTags(body.tags);
      if (!tags) {
        reply.code(400);
        return {
          error: 'Invalid metadata',
          message: 'Tags must be a list of strings',
          field: 'tags',
        };
      }

      const normalizedAccentColor = normalizeHexColor(
        typeof body.accentColor === 'string' ? body.accentColor : null
      );
      const normalizedSecondaryColor = normalizeHexColor(
        typeof body.secondaryColor === 'string' ? body.secondaryColor : null
      );

      if (typeof body.accentColor === 'string' && body.accentColor.trim() !== '' && !normalizedAccentColor) {
        reply.code(400);
        return {
          error: 'Invalid metadata',
          message: 'Primary color must be a hex value like #A1B2C3',
          field: 'accentColor',
        };
      }

      if (typeof body.secondaryColor === 'string' && body.secondaryColor.trim() !== '' && !normalizedSecondaryColor) {
        reply.code(400);
        return {
          error: 'Invalid metadata',
          message: 'Secondary color must be a hex value like #A1B2C3',
          field: 'secondaryColor',
        };
      }

      const currentManifest = parseManifestJson(bundles[0].manifestJson);
      const colors = {
        ...(currentManifest.colors && typeof currentManifest.colors === 'object' ? currentManifest.colors : {}),
      } as Record<string, string>;

      if (normalizedAccentColor) {
        colors.primary = normalizedAccentColor;
      } else {
        delete colors.primary;
      }

      if (normalizedSecondaryColor) {
        colors.secondary = normalizedSecondaryColor;
      } else {
        delete colors.secondary;
      }

      const nextManifest: Record<string, any> = {
        ...currentManifest,
        name,
        summary,
        tags,
      };

      if (Object.keys(colors).length > 0) {
        nextManifest.colors = colors;
      } else {
        delete nextManifest.colors;
      }

      const updatedRows = await db.update(publisherBundle)
        .set({
          manifestJson: JSON.stringify(nextManifest),
          accentColor: normalizedAccentColor,
          updatedAt: new Date(),
        })
        .where(eq(publisherBundle.id, bundleId))
        .returning();

      return {
        success: true,
        bundle: updatedRows[0],
      };
    } catch (error) {
      console.error('Metadata update error:', error);
      reply.code(500);
      return { error: 'Failed to update metadata' };
    }
  });
}, {
  name: 'publisher-bundles-route',
});
