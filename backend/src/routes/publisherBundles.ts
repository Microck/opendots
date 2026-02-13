import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { auth } from '../auth/auth';
import { dbInstance as db } from '../db/db';
import { publisherBundle } from '../db/schema/publisher';
import { eq, and, desc } from 'drizzle-orm';
import { createGitHubClient, getRepoInfo, getFileContent } from '../github/githubClient';
import { fetchAndValidateManifest } from '../import/manifest';
import { importBundle, getLastImport } from '../import/importer';
import { importRun } from '../db/schema/imports';

const REPO_NAME_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

export const publisherBundlesRoute: FastifyPluginAsync = fp(async (fastify) => {
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

      const body = request.body as { repo?: string };
      const repoInput = body.repo?.trim();

      if (!repoInput) {
        reply.code(400);
        return {
          code: 'MISSING_FIELD',
          message: 'Repository is required',
          field: 'repo',
        };
      }

      let owner: string;
      let repo: string;
      let fullName: string;

      const githubUrlMatch = repoInput.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
      if (githubUrlMatch) {
        owner = githubUrlMatch[1];
        repo = githubUrlMatch[2];
        fullName = `${owner}/${repo}`;
      } else {
        const parts = repoInput.split('/');
        if (parts.length !== 2) {
          reply.code(400);
          return {
            code: 'INVALID_FORMAT',
            message: 'Repository must be in format "owner/repo" or a GitHub URL',
            field: 'repo',
          };
        }
        [owner, repo] = parts;
        fullName = repoInput;
      }

      if (!REPO_NAME_REGEX.test(repo)) {
        reply.code(400);
        return {
          code: 'INVALID_REPO_NAME',
          message: 'Repository name contains invalid characters',
          field: 'repo',
        };
      }

      const account = await db.select().from(require('../db/schema/auth').account).where(
        eq(require('../db/schema/auth').account.userId, session.user.id)
      ).limit(1);

      if (!account || !account[0]) {
        reply.code(401);
        return { error: 'GitHub account not linked' };
      }

      const githubAccessToken = account[0].accessToken;
      if (!githubAccessToken) {
        reply.code(401);
        return { error: 'GitHub access token not found' };
      }

      const octokit = createGitHubClient(githubAccessToken);
      const repoInfo = await getRepoInfo(octokit, owner, repo);

      if (!repoInfo) {
        reply.code(404);
        return {
          code: 'REPO_NOT_FOUND',
          message: 'Repository not found or not accessible',
        };
      }

      if (!repoInfo.permissions.admin && !repoInfo.permissions.maintain) {
        reply.code(403);
        return {
          code: 'NO_CONTROL',
          message: 'You must have admin or maintainer permissions on this repository',
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
      if ('field' in manifestResult) {
        // No manifest found — derive metadata from repo
        manifest = {
          id: repo,
          name: repo.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          summary: repoInfo.description || '',
          license: repoInfo.license?.spdx_id || 'Unknown',
        };
      } else {
        manifest = manifestResult;
      }

      const existingBundle = await db.select()
        .from(publisherBundle)
        .where(
          and(
            eq(publisherBundle.publisherAccountId, session.user.id),
            eq(publisherBundle.githubRepo, repo)
          )
        )
        .limit(1);

      if (existingBundle.length > 0) {
        reply.code(409);
        return {
          code: 'ALREADY_REGISTERED',
          message: 'This repository is already registered',
        };
      }

      const insertedBundle = await db.insert(publisherBundle).values({
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

      reply.code(201);
      return { bundle: insertedBundle[0] };
    } catch (error: any) {
      console.error('Registration error:', error);
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

      const account = await db.select().from(require('../db/schema/auth').account).where(
        eq(require('../db/schema/auth').account.userId, session.user.id)
      ).limit(1);

      if (!account || !account[0]) {
        reply.code(401);
        return { error: 'GitHub account not linked' };
      }

      const githubAccessToken = account[0].accessToken;
      if (!githubAccessToken) {
        reply.code(401);
        return { error: 'GitHub access token not found' };
      }

      const octokit = createGitHubClient(githubAccessToken);
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

      const result = await importBundle(bundleId, githubAccessToken);

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
      reply.code(500);
      return { error: 'Failed to refresh bundle' };
    }
  });
}, {
  name: 'publisher-bundles-route',
});
