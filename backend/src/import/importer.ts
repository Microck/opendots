import { Octokit } from 'octokit';
import { dbInstance as db } from '../db/db';
import { importRun, snapshot } from '../db/schema/imports';
import { publisherBundle } from '../db/schema/publisher';
import { eq, desc, and } from 'drizzle-orm';
import { createGitHubClient } from '../github/githubClient';
import { saveSnapshot, snapshotExists } from '../storage/snapshots';
import { buildFileIndex } from './fileIndex';

const MAX_ZIP_SIZE_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 60000;

export interface ImportError {
  code: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  error?: ImportError;
  commitSha?: string;
  importRunId?: string;
}

export async function importBundle(
  bundleId: string,
  githubAccessToken: string
): Promise<ImportResult> {
  try {
    const bundle = await db.select()
      .from(publisherBundle)
      .where(eq(publisherBundle.id, bundleId))
      .limit(1);

    if (!bundle || !bundle[0]) {
      return {
        success: false,
        error: {
          code: 'BUNDLE_NOT_FOUND',
          message: 'Bundle not found',
        },
      };
    }

    const bundleData = bundle[0];
    const { githubOwner, githubRepo } = bundleData;

    const octokit = createGitHubClient(githubAccessToken);

    const commitSha = await getHeadCommitSha(octokit, githubOwner, githubRepo);
    if (!commitSha) {
      throw new Error('Failed to get HEAD commit SHA');
    }

    const importRunId = crypto.randomUUID();

    await db.insert(importRun).values({
      id: importRunId,
      bundleId,
      status: 'pending',
      commitSha,
      startedAt: new Date(),
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const zipResponse = await octokit.rest.repos.downloadZipballArchive({
        owner: githubOwner,
        repo: githubRepo,
        ref: commitSha,
        request: {
          signal: controller.signal,
        },
      });

      clearTimeout(timeoutId);

      if (!zipResponse.data) {
        throw new Error('No data received from GitHub');
      }

      const zipBuffer = Buffer.from(await (zipResponse.data as any).arrayBuffer());

      if (zipBuffer.length > MAX_ZIP_SIZE_BYTES) {
        throw new Error(`Snapshot too large: ${zipBuffer.length} bytes (max ${MAX_ZIP_SIZE_BYTES})`);
      }

      const snapshotInfo = await saveSnapshot(bundleId, commitSha, zipBuffer);
      
      // Build file index from the saved snapshot
      const fileIndex = buildFileIndex(snapshotInfo.path);

      await db.insert(snapshot).values({
        bundleId,
        commitSha,
        storagePath: snapshotInfo.path,
        byteSize: snapshotInfo.byteSize,
        fileIndex: JSON.stringify(fileIndex),
      });

      await db.update(importRun)
        .set({
          status: 'success',
          finishedAt: new Date(),
        })
        .where(eq(importRun.id, importRunId));

      return {
        success: true,
        commitSha,
        importRunId,
      };
    } catch (fetchError: any) {
      let errorCode = 'FETCH_FAILED';
      let errorMessage = fetchError.message || 'Failed to download repository';

      if (fetchError.name === 'AbortError') {
        errorCode = 'TIMEOUT';
        errorMessage = 'Repository download timed out';
      }

      await db.update(importRun)
        .set({
          status: 'failure',
          finishedAt: new Date(),
          errorCode,
          errorMessage,
        })
        .where(eq(importRun.id, importRunId));

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
        commitSha,
        importRunId,
      };
    }
  } catch (error: any) {
    console.error('Import error:', error);

    return {
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: error.message || 'Import failed',
      },
    };
  }
}

export async function getHeadCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: 'HEAD',
    });

    return response.data.sha;
  } catch (error: any) {
    console.error('Failed to get HEAD commit:', error);
    return null;
  }
}

export async function getLastImport(bundleId: string) {
  const lastImport = await db.select()
    .from(importRun)
    .where(eq(importRun.bundleId, bundleId))
    .orderBy(desc(importRun.finishedAt))
    .limit(1);

  return lastImport[0] || null;
}
