import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, '..', '..', 'storage', 'snapshots');

function isRemotePath(storagePath: string) {
  return storagePath.startsWith('http://') || storagePath.startsWith('https://');
}

function getLocalCachePath(bundleId: string, commitSha: string) {
  // Vercel/serverless: only /tmp is writable + ephemeral.
  // Local dev: /tmp also works and avoids polluting repo.
  return path.join(os.tmpdir(), 'opendots-snapshots', bundleId, `${commitSha}.zip`);
}

export interface SnapshotInfo {
  // Durable storage location (local file path for dev, or remote URL for serverless).
  storagePath: string;
  // Local file path where the zip can be read immediately.
  localPath: string;
  byteSize: number;
}

export async function saveSnapshot(
  bundleId: string,
  commitSha: string,
  zipBuffer: Buffer
): Promise<SnapshotInfo> {
  // Always write a local copy first so the importer can index/scan it.
  const localPath = process.env.VERCEL
    ? getLocalCachePath(bundleId, commitSha)
    : path.join(SNAPSHOT_DIR, bundleId, `${commitSha}.zip`);

  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, zipBuffer);

  let storagePath = localPath;

  // Optional: upload snapshot to Vercel Blob for serverless durability.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const key = `snapshots/${bundleId}/${commitSha}.zip`;
    const result = await put(key, zipBuffer, {
      access: 'public',
      contentType: 'application/zip',
      addRandomSuffix: false,
    });
    storagePath = result.url;
  }

  return {
    storagePath,
    localPath,
    byteSize: zipBuffer.length,
  };
}

export async function materializeSnapshotToLocal(params: {
  storagePath: string;
  bundleId: string;
  commitSha: string;
}): Promise<string> {
  const { storagePath, bundleId, commitSha } = params;

  if (!isRemotePath(storagePath)) {
    return storagePath;
  }

  const localPath = getLocalCachePath(bundleId, commitSha);
  try {
    await fs.access(localPath);
    return localPath;
  } catch {
    // continue
  }

  const response = await fetch(storagePath);
  if (!response.ok) {
    throw new Error(`Failed to download snapshot: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return localPath;
}
