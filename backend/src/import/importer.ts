import { Octokit } from 'octokit';
import { dbInstance as db } from '../db/db.js';
import { importRun, snapshot } from '../db/schema/imports.js';
import { publisherBundle } from '../db/schema/publisher.js';
import { eq, desc, and } from 'drizzle-orm';
import { createGitHubClient, getRepoInfo } from '../github/githubClient.js';
import { saveSnapshot } from '../storage/snapshots.js';
import { buildFileIndex, extractFileFromZip, type FileIndexEntry } from './fileIndex.js';
import { validateSnapshot } from './validator.js';
import { scanForRisks } from './riskScanner.js';
import { scanForSecrets, SECRET_SCAN_DISCLAIMER } from './secretScanner.js';
import AdmZip from 'adm-zip';
import { parse as parseJsonc } from 'comment-json';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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
    let latestRepoInfo = null;

    try {
      latestRepoInfo = await getRepoInfo(octokit, githubOwner, githubRepo);
    } catch (repoInfoError) {
      console.warn('Failed to refresh GitHub stats during import:', repoInfoError);
    }

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

      const responseData = zipResponse.data as any;
      let zipBuffer: Buffer;

      if (responseData instanceof ArrayBuffer) {
        zipBuffer = Buffer.from(responseData);
      } else if (ArrayBuffer.isView(responseData)) {
        zipBuffer = Buffer.from(
          responseData.buffer,
          responseData.byteOffset,
          responseData.byteLength
        );
      } else if (Buffer.isBuffer(responseData)) {
        zipBuffer = responseData;
      } else if (typeof responseData?.arrayBuffer === 'function') {
        zipBuffer = Buffer.from(await responseData.arrayBuffer());
      } else {
        throw new Error('Unsupported zip payload type from GitHub download API');
      }

      if (zipBuffer.length > MAX_ZIP_SIZE_BYTES) {
        throw new Error(`Snapshot too large: ${zipBuffer.length} bytes (max ${MAX_ZIP_SIZE_BYTES})`);
      }

      const snapshotInfo = await saveSnapshot(bundleId, commitSha, zipBuffer);

      // Build file index from the local snapshot
      const fileIndex = buildFileIndex(snapshotInfo.localPath);
      const manifestAccentColor = extractAccentColorFromManifest(bundleData.manifestJson);
      const accentColor = manifestAccentColor ?? extractAccentColorFromSnapshot(snapshotInfo.localPath, fileIndex);

      // Run safety scans on extracted snapshot
      const safetyResults = await runSafetyScans(snapshotInfo.localPath);

      await db.insert(snapshot).values({
        bundleId,
        commitSha,
        storagePath: snapshotInfo.storagePath,
        byteSize: snapshotInfo.byteSize,
        fileIndex: JSON.stringify(fileIndex),
        safetyResults: JSON.stringify(safetyResults),
      });

      const bundleUpdate: {
        updatedAt: Date;
        accentColor: string | null;
        stars?: number;
        forks?: number;
      } = {
        updatedAt: new Date(),
        accentColor,
      };

      if (latestRepoInfo) {
        bundleUpdate.stars = latestRepoInfo.stargazers_count;
        bundleUpdate.forks = latestRepoInfo.forks_count;
      }

      await db.update(publisherBundle)
        .set(bundleUpdate)
        .where(eq(publisherBundle.id, bundleId));

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

// Import a bundle from a public GitHub repository without requiring a user access token.
// Used by the publish-with-claim flow.
export async function importBundlePublic(bundleId: string): Promise<ImportResult> {
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

    const { getPublicRepoInfo, getPublicHeadCommitSha, downloadPublicZipball } = await import('../github/publicGitHub.js');

    const repoInfo = await getPublicRepoInfo(githubOwner, githubRepo);
    if (!repoInfo) {
      return {
        success: false,
        error: {
          code: 'REPO_NOT_FOUND',
          message: 'Repository not found on GitHub',
        },
      };
    }

    const defaultBranch = repoInfo.default_branch || 'HEAD';
    const commitSha = await getPublicHeadCommitSha(githubOwner, githubRepo, defaultBranch);
    if (!commitSha) {
      return {
        success: false,
        error: {
          code: 'COMMIT_NOT_FOUND',
          message: 'Failed to determine repository HEAD commit',
        },
      };
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
      const zipBuffer = await downloadPublicZipball({
        owner: githubOwner,
        repo: githubRepo,
        ref: commitSha,
        timeoutMs: FETCH_TIMEOUT_MS,
      });

      if (zipBuffer.length > MAX_ZIP_SIZE_BYTES) {
        throw new Error(`Snapshot too large: ${zipBuffer.length} bytes (max ${MAX_ZIP_SIZE_BYTES})`);
      }

      const snapshotInfo = await saveSnapshot(bundleId, commitSha, zipBuffer);

      const fileIndex = buildFileIndex(snapshotInfo.localPath);
      const manifestAccentColor = extractAccentColorFromManifest(bundleData.manifestJson);
      const accentColor = manifestAccentColor ?? extractAccentColorFromSnapshot(snapshotInfo.localPath, fileIndex);

      const safetyResults = await runSafetyScans(snapshotInfo.localPath);

      await db.insert(snapshot).values({
        bundleId,
        commitSha,
        storagePath: snapshotInfo.storagePath,
        byteSize: snapshotInfo.byteSize,
        fileIndex: JSON.stringify(fileIndex),
        safetyResults: JSON.stringify(safetyResults),
      });

      await db.update(publisherBundle)
        .set({
          updatedAt: new Date(),
          accentColor,
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
          defaultBranch: repoInfo.default_branch,
          repoHtmlUrl: repoInfo.html_url,
          githubRepoId: repoInfo.id,
        })
        .where(eq(publisherBundle.id, bundleId));

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
    console.error('Public import error:', error);
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

interface SafetyResults {
  validation: {
    config: { valid: boolean; errors: string[]; warnings: string[] } | null;
    themes: { file: string; valid: boolean; errors: string[] }[];
    skills: { file: string; valid: boolean; errors: string[] }[];
  };
  riskFlags: {
    flag: string;
    description: string;
    files: string[];
    severity: 'high' | 'medium' | 'low';
  }[];
  secretWarnings: {
    file: string;
    line: number;
    pattern: string;
    snippet: string;
  }[];
  disclaimer: string;
}

/**
 * Extract zip and run all safety scans
 */
async function runSafetyScans(zipPath: string): Promise<SafetyResults> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'opendots-scan-'));

  try {
    // Extract zip to temp directory
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Find the extracted folder (GitHub zips have a root folder)
    const entries = await fs.readdir(tempDir);
    const extractedFolder = entries.find(entry => !entry.startsWith('.'));

    if (!extractedFolder) {
      throw new Error('No extracted folder found in zip');
    }

    const snapshotContentPath = path.join(tempDir, extractedFolder);

    // Run all scans in parallel
    const [validation, riskFlags, secretWarnings] = await Promise.all([
      validateSnapshot(snapshotContentPath),
      scanForRisks(snapshotContentPath),
      scanForSecrets(snapshotContentPath),
    ]);

    return {
      validation,
      riskFlags,
      secretWarnings,
      disclaimer: SECRET_SCAN_DISCLAIMER,
    };
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Failed to clean up temp directory:', cleanupError);
    }
  }
}

function extractAccentColorFromSnapshot(zipPath: string, fileIndex: FileIndexEntry[]): string | null {
  for (const file of fileIndex) {
    if (!isThemeFile(file)) {
      continue;
    }

    const content = extractFileFromZip(zipPath, file.path);
    if (!content) {
      continue;
    }

    const parsedTheme = parseThemeJson(content);
    if (!parsedTheme) {
      continue;
    }

    const resolvedPrimary = getThemePrimary(parsedTheme);
    if (!resolvedPrimary) {
      continue;
    }

    return resolvedPrimary;
  }

  return null;
}

function extractAccentColorFromManifest(manifestJson: string | null): string | null {
  if (!manifestJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(manifestJson) as Record<string, unknown>;
    const accentCandidate = parsed.accentColor;
    if (typeof accentCandidate !== 'string') {
      return null;
    }

    return normalizeHexColor(accentCandidate);
  } catch {
    return null;
  }
}

function isThemeFile(file: FileIndexEntry): boolean {
  if (file.kind === 'theme') {
    return true;
  }

  const normalizedPath = file.path.toLowerCase();
  return /(^|\/)(\.opencode\/)?themes\//.test(normalizedPath) && normalizedPath.endsWith('.json');
}

function parseThemeJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = parseJsonc(content, undefined, true);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveThemeColorToken(theme: Record<string, unknown>, value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const directHex = normalizeHexColor(value);
  if (directHex) {
    return directHex;
  }

  const defs = theme.defs;
  if (!defs || typeof defs !== 'object') {
    return null;
  }

  const resolved = (defs as Record<string, unknown>)[value];
  if (typeof resolved !== 'string') {
    return null;
  }

  return normalizeHexColor(resolved);
}

function getThemePrimary(theme: Record<string, unknown>): string | null {
  const candidateContainers: unknown[] = [
    theme.primary,
    theme.colors && typeof theme.colors === 'object'
      ? (theme.colors as Record<string, unknown>).primary
      : null,
    theme.theme && typeof theme.theme === 'object'
      ? (theme.theme as Record<string, unknown>).primary
      : null,
    theme.theme && typeof theme.theme === 'object'
      ? (theme.theme as Record<string, unknown>).accent
      : null,
  ];

  for (const candidate of candidateContainers) {
    if (!candidate) {
      continue;
    }

    if (typeof candidate === 'string') {
      const resolved = resolveThemeColorToken(theme, candidate);
      if (resolved) {
        return resolved;
      }
      continue;
    }

    if (typeof candidate === 'object') {
      const palette = candidate as Record<string, unknown>;
      const preferred = [palette.dark, palette.light, palette.default, palette.primary, palette.accent];
      for (const value of preferred) {
        const resolved = resolveThemeColorToken(theme, value);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return null;
}

function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim();
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hex = match[1].toLowerCase();
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }

  return `#${hex}`;
}
