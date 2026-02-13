import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { dbInstance as db } from '../db/db';
import { publisherBundle } from '../db/schema/publisher';
import { snapshot, importRun } from '../db/schema/imports';
import { eq, desc, sql } from 'drizzle-orm';
import { extractFileFromZip } from '../import/fileIndex';
import fs from 'fs/promises';

const MAX_PREVIEW_SIZE = 100 * 1024; // 100KB

export const publicBundlesRoute: FastifyPluginAsync = fp(async (fastify) => {
  // List all public bundles
  fastify.get('/api/bundles', async (request, reply) => {
    try {
      const bundles = await db.select({
        id: publisherBundle.id,
        githubFullName: publisherBundle.githubFullName,
        githubOwner: publisherBundle.githubOwner,
        githubRepo: publisherBundle.githubRepo,
        status: publisherBundle.status,
        createdAt: publisherBundle.createdAt,
        repoHtmlUrl: publisherBundle.repoHtmlUrl,
        manifestJson: publisherBundle.manifestJson,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.status, 'registered'));

      const bundlesWithLatest = await Promise.all(
        bundles.map(async (bundle) => {
          const latestSnapshot = await db.select({
            commitSha: snapshot.commitSha,
            createdAt: snapshot.createdAt,
            fileIndex: snapshot.fileIndex,
          })
            .from(snapshot)
            .where(eq(snapshot.bundleId, bundle.id))
            .orderBy(desc(snapshot.createdAt))
            .limit(1);
          
          const lastImport = await db.select({
            commitSha: importRun.commitSha,
            status: importRun.status,
            finishedAt: importRun.finishedAt,
          })
            .from(importRun)
            .where(eq(importRun.bundleId, bundle.id))
            .orderBy(desc(importRun.finishedAt))
            .limit(1);

          let manifest = null;
          try {
            if (bundle.manifestJson) {
              manifest = JSON.parse(bundle.manifestJson);
            }
          } catch {
            // Invalid manifest JSON, leave as null
          }

          return {
            id: bundle.id,
            name: manifest?.name || bundle.githubRepo,
            summary: manifest?.summary || '',
            tags: manifest?.tags || [],
            license: manifest?.license || '',
            repoUrl: bundle.repoHtmlUrl,
            githubFullName: bundle.githubFullName,
            status: bundle.status,
            createdAt: bundle.createdAt,
            latestSnapshot: latestSnapshot[0] ? {
              commitSha: latestSnapshot[0].commitSha,
              createdAt: latestSnapshot[0].createdAt,
              fileCount: latestSnapshot[0].fileIndex ? JSON.parse(latestSnapshot[0].fileIndex).length : 0,
            } : null,
            lastImport: lastImport[0] ? {
              commitSha: lastImport[0].commitSha,
              status: lastImport[0].status,
              importedAt: lastImport[0].finishedAt,
            } : null,
          };
        })
      );

      return { bundles: bundlesWithLatest };
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
      reply.code(500);
      return { error: 'Failed to fetch bundles' };
    }
  });

  // Get bundle detail
  fastify.get('/api/bundles/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const bundle = await db.select({
        id: publisherBundle.id,
        githubFullName: publisherBundle.githubFullName,
        githubOwner: publisherBundle.githubOwner,
        githubRepo: publisherBundle.githubRepo,
        status: publisherBundle.status,
        createdAt: publisherBundle.createdAt,
        repoHtmlUrl: publisherBundle.repoHtmlUrl,
        manifestJson: publisherBundle.manifestJson,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.id, id))
        .limit(1);

      if (!bundle || bundle.length === 0) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const bundleData = bundle[0];

      // Get latest snapshot with file index
      const latestSnapshot = await db.select({
        commitSha: snapshot.commitSha,
        createdAt: snapshot.createdAt,
        storagePath: snapshot.storagePath,
        fileIndex: snapshot.fileIndex,
        byteSize: snapshot.byteSize,
      })
        .from(snapshot)
        .where(eq(snapshot.bundleId, id))
        .orderBy(desc(snapshot.createdAt))
        .limit(1);

      // Get last import info
      const lastImport = await db.select({
        commitSha: importRun.commitSha,
        status: importRun.status,
        finishedAt: importRun.finishedAt,
        errorCode: importRun.errorCode,
        errorMessage: importRun.errorMessage,
      })
        .from(importRun)
        .where(eq(importRun.bundleId, id))
        .orderBy(desc(importRun.finishedAt))
        .limit(1);

      let manifest = null;
      let fileIndex = null;

      try {
        if (bundleData.manifestJson) {
          manifest = JSON.parse(bundleData.manifestJson);
        }
      } catch {
        // Invalid manifest JSON
      }

      try {
        if (latestSnapshot[0]?.fileIndex) {
          fileIndex = JSON.parse(latestSnapshot[0].fileIndex);
        }
      } catch {
        // Invalid file index JSON
      }

      return {
        id: bundleData.id,
        name: manifest?.name || bundleData.githubRepo,
        summary: manifest?.summary || '',
        description: manifest?.description || '',
        tags: manifest?.tags || [],
        license: manifest?.license || '',
        compatibility: manifest?.compatibility || {},
        repoUrl: bundleData.repoHtmlUrl,
        githubFullName: bundleData.githubFullName,
        status: bundleData.status,
        createdAt: bundleData.createdAt,
        latestSnapshot: latestSnapshot[0] ? {
          commitSha: latestSnapshot[0].commitSha,
          createdAt: latestSnapshot[0].createdAt,
          byteSize: latestSnapshot[0].byteSize,
        } : null,
        fileIndex: fileIndex || [],
        lastImport: lastImport[0] ? {
          commitSha: lastImport[0].commitSha,
          status: lastImport[0].status,
          importedAt: lastImport[0].finishedAt,
          errorCode: lastImport[0].errorCode,
          errorMessage: lastImport[0].errorMessage,
        } : null,
      };
    } catch (error) {
      console.error('Failed to fetch bundle:', error);
      reply.code(500);
      return { error: 'Failed to fetch bundle' };
    }
  });

  // Get file content from bundle
  fastify.get('/api/bundles/:id/file', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { path: filePath } = request.query as { path?: string };

      if (!filePath) {
        reply.code(400);
        return { error: 'Missing path parameter' };
      }

      // Get the bundle to verify it exists
      const bundle = await db.select({
        id: publisherBundle.id,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.id, id))
        .limit(1);

      if (!bundle || bundle.length === 0) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      // Get the latest snapshot for this bundle
      const latestSnapshot = await db.select({
        storagePath: snapshot.storagePath,
        fileIndex: snapshot.fileIndex,
      })
        .from(snapshot)
        .where(eq(snapshot.bundleId, id))
        .orderBy(desc(snapshot.createdAt))
        .limit(1);

      if (!latestSnapshot || latestSnapshot.length === 0) {
        reply.code(404);
        return { error: 'No snapshot found for this bundle' };
      }

      const snapshotData = latestSnapshot[0];

      // Check if file exists in the file index
      let fileIndex = null;
      try {
        if (snapshotData.fileIndex) {
          fileIndex = JSON.parse(snapshotData.fileIndex);
        }
      } catch {
        // Invalid file index
      }

      if (fileIndex) {
        const fileEntry = fileIndex.find((f: any) => f.path === filePath);
        if (!fileEntry) {
          reply.code(404);
          return { error: 'File not found in bundle' };
        }
        
        if (fileEntry.isBinary || !fileEntry.isPreviewable) {
          reply.code(400);
          return { error: 'File is not previewable (binary file)' };
        }
        
        if (fileEntry.size > MAX_PREVIEW_SIZE) {
          reply.code(413);
          return { error: 'File too large to preview (max 100KB)' };
        }
      }

      // Extract file content from zip
      const content = extractFileFromZip(snapshotData.storagePath, filePath);

      if (content === null) {
        reply.code(404);
        return { error: 'File not found in snapshot' };
      }

      // Check content size
      if (content.length > MAX_PREVIEW_SIZE) {
        reply.code(413);
        return { error: 'File too large to preview (max 100KB)' };
      }

      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return content;
    } catch (error) {
      console.error('Failed to fetch file:', error);
      reply.code(500);
      return { error: 'Failed to fetch file' };
    }
  });
}, {
  name: 'public-bundles-route',
});
