import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomBytes } from 'node:crypto';
import { dbInstance as db } from '../db/db.js';
import { publishClaim, publisherBundle } from '../db/schema/publisher.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import { fetchAndValidateManifest } from '../import/manifest.js';
import { importBundlePublic } from '../import/importer.js';
import { getPublicFileContent, getPublicRepoInfo } from '../github/publicGitHub.js';
import { checkRateLimit } from '../security/rateLimit.js';
import { verifyTurnstileToken } from '../security/turnstile.js';

const REPO_NAME_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;
const CLAIM_TTL_MS = 30 * 60 * 1000;

function getAppBaseUrl() {
  const base = process.env.APP_BASE_URL?.trim();
  if (!base) {
    return 'https://opendots.me';
  }
  return base.replace(/\/+$/, '');
}

function isUniqueConstraintError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  if (code === 'SQLITE_CONSTRAINT' || code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return true;
  }

  const message = String((error as { message?: string })?.message ?? '').toLowerCase();
  return message.includes('unique constraint failed');
}

function getClientIp(request: any): string {
  const xff = request.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

function isRateLimited(result: Awaited<ReturnType<typeof checkRateLimit>>): result is { allowed: false; remaining: 0; resetAt: number; retryAfterMs: number } {
  return result.allowed === false;
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

function randomClaimCode(): string {
  // Short, copy/paste-friendly token.
  return randomBytes(12).toString('hex');
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

export const publishClaimRoute: FastifyPluginAsync = fp(async (fastify) => {
  // Start a claim: returns a claim code that must be committed to the target repo.
  fastify.post('/api/publish/claim/start', async (request, reply) => {
    try {
      const ip = getClientIp(request);
      const ipLimit = await checkRateLimit(`publish-claim-start:ip:${ip}`, { windowMs: 10 * 60 * 1000, max: 12 });
      if (isRateLimited(ipLimit)) {
        reply.header('Retry-After', Math.ceil(ipLimit.retryAfterMs / 1000));
        reply.code(429);
        return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' };
      }

      reply.header('Cache-Control', 'no-store');

      const body = (request.body && typeof request.body === 'object'
        ? request.body
        : {}) as { repo?: unknown; captchaToken?: unknown };
      const repoInput = typeof body.repo === 'string' ? body.repo.trim() : '';
      const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined;

      if (!repoInput) {
        reply.code(400);
        return { code: 'INVALID_FORMAT', message: 'repo is required' };
      }

      const parsed = parseRepoInput(repoInput);
      if (!parsed) {
        reply.code(400);
        return { code: 'INVALID_FORMAT', message: 'repo must be "owner/repo" or a GitHub URL' };
      }

      const repoLimit = await checkRateLimit(`publish-claim-start:repo:${parsed.fullName.toLowerCase()}`, { windowMs: 60 * 60 * 1000, max: 6 });
      if (isRateLimited(repoLimit)) {
        reply.header('Retry-After', Math.ceil(repoLimit.retryAfterMs / 1000));
        reply.code(429);
        return { code: 'RATE_LIMITED', message: 'Too many claim attempts for this repository. Please try again later.' };
      }

      const captcha = await verifyTurnstileToken({ token: captchaToken, remoteIp: ip });
      if (captcha.required && !captcha.success) {
        reply.code(400);
        return { code: 'CAPTCHA_FAILED', message: 'Captcha verification failed. Please retry.' };
      }

      if (!REPO_NAME_REGEX.test(parsed.repo)) {
        reply.code(400);
        return { code: 'INVALID_REPO_NAME', message: 'Invalid repository name' };
      }

      const repoInfo = await getPublicRepoInfo(parsed.owner, parsed.repo);
      if (!repoInfo) {
        reply.code(404);
        return { code: 'REPO_NOT_FOUND', message: 'Repository not found on GitHub' };
      }

      if (repoInfo.private) {
        reply.code(400);
        return { code: 'REPO_PRIVATE', message: 'Repository must be public for loginless publish' };
      }

      const now = Date.now();
      const nowSeconds = Math.floor(now / 1000);
      const existing = await db.select()
        .from(publishClaim)
        .where(
          and(
            eq(publishClaim.repoFullName, repoInfo.full_name),
            eq(publishClaim.status, 'pending'),
          )
        )
        .orderBy(desc(publishClaim.createdAt))
        .limit(5);

      const reusable = existing.find((c) => c.expiresAt.getTime() > now);
      if (reusable) {
        return {
          repoFullName: reusable.repoFullName,
          claimCode: reusable.claimCode,
          claimFilePath: reusable.claimFilePath,
          expiresAt: reusable.expiresAt,
        };
      }

      // Mark stale pending claims as expired to keep the table tidy.
      await db.update(publishClaim)
        .set({ status: 'expired' })
        .where(
          and(
            eq(publishClaim.repoFullName, repoInfo.full_name),
            eq(publishClaim.status, 'pending'),
            sql`${publishClaim.expiresAt} <= ${nowSeconds}`,
          )
        );

      const claimCode = randomClaimCode();
      const expiresAt = new Date(now + CLAIM_TTL_MS);
      const claimId = crypto.randomUUID();

      await db.insert(publishClaim).values({
        id: claimId,
        repoFullName: repoInfo.full_name,
        claimCode,
        claimFilePath: 'opendots-claim.txt',
        status: 'pending',
        expiresAt,
      });

      return {
        repoFullName: repoInfo.full_name,
        claimCode,
        claimFilePath: 'opendots-claim.txt',
        expiresAt,
      };
    } catch (error: any) {
      console.error('Claim start error:', error);
      reply.code(500);
      return { code: 'CLAIM_START_FAILED', message: 'Failed to start claim' };
    }
  });

  // Complete a claim: verifies claim file in repo, registers the bundle, runs the first import.
  fastify.post('/api/publish/claim/complete', async (request, reply) => {
    try {
      const ip = getClientIp(request);
      const ipLimit = await checkRateLimit(`publish-claim-complete:ip:${ip}`, { windowMs: 10 * 60 * 1000, max: 30 });
      if (isRateLimited(ipLimit)) {
        reply.header('Retry-After', Math.ceil(ipLimit.retryAfterMs / 1000));
        reply.code(429);
        return { code: 'RATE_LIMITED', message: 'Too many requests. Please wait and try again.' };
      }

      reply.header('Cache-Control', 'no-store');

      const body = (request.body && typeof request.body === 'object'
        ? request.body
        : {}) as { repo?: unknown; claimCode?: unknown };
      const repoInput = typeof body.repo === 'string' ? body.repo.trim() : '';
      const claimCode = typeof body.claimCode === 'string' ? body.claimCode.trim() : '';

      if (!repoInput || !claimCode) {
        reply.code(400);
        return { code: 'INVALID_FORMAT', message: 'repo and claimCode are required' };
      }

      if (!/^[a-f0-9]{24}$/i.test(claimCode)) {
        reply.code(400);
        return { code: 'CLAIM_INVALID', message: 'Invalid claim code format' };
      }

      const parsed = parseRepoInput(repoInput);
      if (!parsed) {
        reply.code(400);
        return { code: 'INVALID_FORMAT', message: 'repo must be "owner/repo" or a GitHub URL' };
      }

      const repoLimit = await checkRateLimit(`publish-claim-complete:repo:${parsed.fullName.toLowerCase()}`, { windowMs: 60 * 60 * 1000, max: 10 });
      if (isRateLimited(repoLimit)) {
        reply.header('Retry-After', Math.ceil(repoLimit.retryAfterMs / 1000));
        reply.code(429);
        return { code: 'RATE_LIMITED', message: 'Too many publish attempts for this repository. Please try again later.' };
      }

      const repoInfo = await getPublicRepoInfo(parsed.owner, parsed.repo);
      if (!repoInfo) {
        reply.code(404);
        return { code: 'REPO_NOT_FOUND', message: 'Repository not found on GitHub' };
      }

      if (repoInfo.private) {
        reply.code(400);
        return { code: 'REPO_PRIVATE', message: 'Repository must be public for loginless publish' };
      }

      const claimRows = await db.select()
        .from(publishClaim)
        .where(
          and(
            eq(publishClaim.repoFullName, repoInfo.full_name),
            eq(publishClaim.claimCode, claimCode),
            eq(publishClaim.status, 'pending'),
          )
        )
        .limit(1);

      const claim = claimRows[0];
      if (!claim) {
        reply.code(400);
        return { code: 'CLAIM_INVALID', message: 'Invalid claim code for this repository' };
      }

      if (claim.expiresAt.getTime() <= Date.now()) {
        await db.update(publishClaim)
          .set({ status: 'expired' })
          .where(eq(publishClaim.id, claim.id));

        reply.code(410);
        return { code: 'CLAIM_EXPIRED', message: 'Claim code expired. Start a new claim.' };
      }

      const defaultBranch = repoInfo.default_branch || 'main';

      // Verify claim file content.
      const claimContent = await getPublicFileContent({
        owner: parsed.owner,
        repo: parsed.repo,
        ref: defaultBranch,
        path: claim.claimFilePath,
      });

      if (!claimContent || claimContent.trim() !== claimCode) {
        reply.code(400);
        return {
          code: 'CLAIM_NOT_FOUND',
          message: `Claim file not found or does not match. Ensure ${claim.claimFilePath} exists on ${defaultBranch} and contains the exact claim code.`
        };
      }

      const existingBundle = await findBundleByRepo(parsed.owner, parsed.repo);
      const appBaseUrl = getAppBaseUrl();
      if (existingBundle) {
        const importResult = await importBundlePublic(existingBundle.id);

        await db.update(publishClaim)
          .set({
            status: 'completed',
            bundleId: existingBundle.id,
            completedAt: new Date(),
          })
          .where(eq(publishClaim.id, claim.id));

        return {
          alreadyRegistered: true,
          bundleId: existingBundle.id,
          bundleUrl: `${appBaseUrl}/bundle/${existingBundle.id}`,
          importResult,
        };
      }

      // Fetch manifest from repo root, or generate if missing/invalid.
      const getFileContent = async (_owner: string, _repo: string, filePath: string) => {
        return getPublicFileContent({ owner: parsed.owner, repo: parsed.repo, ref: defaultBranch, path: filePath });
      };

      const manifestResult = await fetchAndValidateManifest(getFileContent, parsed.owner, parsed.repo);

      const canonicalRepoName = `opendots-${parsed.owner.toLowerCase()}`;
      const manifest = (manifestResult as any)?.id
        ? (manifestResult as any)
        : {
          id: parsed.repo.toLowerCase(),
          name: parsed.repo.toLowerCase() === canonicalRepoName
            ? `${parsed.owner}'s config`
            : parsed.repo.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          summary: repoInfo.description?.trim() || 'Personal configuration files.',
          license: repoInfo.license?.spdx_id || 'Unknown',
          sourceRepo: `${parsed.owner}/${parsed.repo}`,
          generatedBy: 'opendots-claim',
          generatedAt: new Date().toISOString(),
        };

      const bundleId = crypto.randomUUID();

      try {
        await db.insert(publisherBundle).values({
          id: bundleId,
          publisherAccountId: null,
          githubOwner: repoInfo.owner.login,
          githubRepo: repoInfo.name,
          githubFullName: repoInfo.full_name,
          githubRepoId: repoInfo.id,
          defaultBranch: repoInfo.default_branch,
          repoHtmlUrl: repoInfo.html_url,
          manifestJson: JSON.stringify(manifest),
          status: 'registered',
          createdAt: new Date(),
          updatedAt: new Date(),
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
        });
      } catch (insertError) {
        if (!isUniqueConstraintError(insertError)) {
          throw insertError;
        }

        const concurrentBundle = await findBundleByRepo(repoInfo.owner.login, repoInfo.name);
        if (!concurrentBundle) {
          throw insertError;
        }

        await db.update(publishClaim)
          .set({
            status: 'completed',
            bundleId: concurrentBundle.id,
            completedAt: new Date(),
          })
          .where(eq(publishClaim.id, claim.id));

        const importResult = await importBundlePublic(concurrentBundle.id);

        return {
          alreadyRegistered: true,
          bundleId: concurrentBundle.id,
          bundleUrl: `${appBaseUrl}/bundle/${concurrentBundle.id}`,
          importResult,
        };
      }

      const importResult = await importBundlePublic(bundleId);

      await db.update(publishClaim)
        .set({
          status: 'completed',
          bundleId,
          completedAt: new Date(),
        })
        .where(eq(publishClaim.id, claim.id));

      return {
        alreadyRegistered: false,
        bundleId,
        bundleUrl: `${appBaseUrl}/bundle/${bundleId}`,
        importResult,
        nextStep: 'Sign in with GitHub to claim and manage this bundle in your dashboard.',
      };
    } catch (error: any) {
      console.error('Claim complete error:', error);
      reply.code(500);
      return { code: 'CLAIM_COMPLETE_FAILED', message: 'Failed to complete claim' };
    }
  });
});
