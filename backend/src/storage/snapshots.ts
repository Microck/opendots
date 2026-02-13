import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, '..', '..', 'storage', 'snapshots');

export interface SnapshotInfo {
  path: string;
  byteSize: number;
}

export async function ensureSnapshotDir(): Promise<void> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

export async function saveSnapshot(
  bundleId: string,
  commitSha: string,
  zipBuffer: Buffer
): Promise<SnapshotInfo> {
  await ensureSnapshotDir();

  const bundleDir = path.join(SNAPSHOT_DIR, bundleId);
  await fs.mkdir(bundleDir, { recursive: true });

  const snapshotPath = path.join(bundleDir, `${commitSha}.zip`);
  await fs.writeFile(snapshotPath, zipBuffer);

  return {
    path: snapshotPath,
    byteSize: zipBuffer.length,
  };
}

export async function getSnapshotPath(
  bundleId: string,
  commitSha: string
): Promise<string | null> {
  const snapshotPath = path.join(SNAPSHOT_DIR, bundleId, `${commitSha}.zip`);
  
  try {
    await fs.access(snapshotPath);
    return snapshotPath;
  } catch {
    return null;
  }
}

export async function snapshotExists(
  bundleId: string,
  commitSha: string
): Promise<boolean> {
  const path = await getSnapshotPath(bundleId, commitSha);
  return path !== null;
}
