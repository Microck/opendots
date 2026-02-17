import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { dbInstance as db } from '../db/db';
import { publisherBundle } from '../db/schema/publisher';
import { snapshot, importRun } from '../db/schema/imports';
import { eq, desc } from 'drizzle-orm';
import { extractFileFromZip } from '../import/fileIndex';
import { generateZipStream, isValidVariant } from '../import/zipGenerator';
import { parse as parseJsonc } from 'comment-json';
import { materializeSnapshotToLocal } from '../storage/snapshots';

const MAX_PREVIEW_SIZE = 100 * 1024; // 100KB

interface BundleListQuery {
  q?: string;
  tag?: string | string[];
  type?: string | string[];
  opencode?: string;
  sort?: string;
  limit?: string;
}

interface BundleCardResponse {
  id: string;
  slug: string;
  name: string;
  summary: string;
  owner: string;
  ownerAvatarUrl: string;
  tags: string[];
  artifactTypes: string[];
  riskBadges: string[];
  accentColor: string | null;
  cardTheme: BundleCardTheme | null;
  stars: number;
  forks: number;
  updatedAt: string;
}

interface BundleCardTheme {
  background?: string;
  backgroundHover?: string;
  border?: string;
  borderHover?: string;
  title?: string;
  text?: string;
  mutedText?: string;
  chipBackground?: string;
  chipBorder?: string;
  chipText?: string;
}

interface ParsedManifest {
  id?: unknown;
  name?: unknown;
  summary?: unknown;
  tags?: unknown;
  compatibility?: unknown;
  cardTheme?: unknown;
  bundleCardTheme?: unknown;
}

interface ParsedFileIndexEntry {
  kind?: unknown;
  path?: unknown;
}

interface ParsedSafetyResults {
  riskFlags?: Array<{ flag?: unknown }>;
}

async function resolveBundleId(identifier: string): Promise<string | null> {
  const raw = identifier.trim();
  if (!raw) {
    return null;
  }

  const direct = await db.select({ id: publisherBundle.id })
    .from(publisherBundle)
    .where(eq(publisherBundle.id, raw))
    .limit(1);
  if (direct[0]?.id) {
    return direct[0].id;
  }

  const normalized = raw.toLowerCase();
  const candidates = await db.select({
    id: publisherBundle.id,
    githubOwner: publisherBundle.githubOwner,
    githubRepo: publisherBundle.githubRepo,
    manifestJson: publisherBundle.manifestJson,
  })
    .from(publisherBundle);

  for (const candidate of candidates) {
    if (candidate.githubRepo.toLowerCase() === normalized) {
      return candidate.id;
    }

    const fullName = `${candidate.githubOwner}/${candidate.githubRepo}`.toLowerCase();
    if (fullName === normalized) {
      return candidate.id;
    }

    if (candidate.manifestJson) {
      try {
        const manifest = JSON.parse(candidate.manifestJson) as ParsedManifest;
        if (typeof manifest?.id === 'string' && manifest.id.trim().toLowerCase() === normalized) {
          return candidate.id;
        }
      } catch {
        // Ignore invalid manifest JSON during id resolution.
      }
    }
  }

  return null;
}

const ARTIFACT_TYPE_BY_KIND: Record<string, string> = {
  theme: 'themes',
  command: 'commands',
  agent: 'agents',
  mode: 'modes',
  skill: 'skills',
  plugin: 'plugins',
  tool: 'tools',
  rules: 'rules',
  config: 'config',
  prompt: 'prompts',
  script: 'scripts',
};

const FALLBACK_ACCENT_PALETTE = [
  '#42A5F5',
  '#66BB6A',
  '#AB47BC',
  '#FFA726',
  '#26C6DA',
  '#EC407A',
  '#7E57C2',
  '#29B6F6',
  '#9CCC65',
  '#FF7043',
] as const;

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toQueryValues(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const normalized = values
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(normalized));
}

function toIsoTimestamp(value: Date | string | number | null | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date(0).toISOString();
}

function getDeterministicAccent(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % FALLBACK_ACCENT_PALETTE.length;
  return FALLBACK_ACCENT_PALETTE[index];
}

function normalizeHexColor(color: unknown): string | null {
  if (typeof color !== 'string') {
    return null;
  }

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

function toBundleCardTheme(input: unknown): BundleCardTheme | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const source = input as Record<string, unknown>;
  const theme: BundleCardTheme = {
    background: normalizeHexColor(source.background) ?? undefined,
    backgroundHover: normalizeHexColor(source.backgroundHover) ?? undefined,
    border: normalizeHexColor(source.border) ?? undefined,
    borderHover: normalizeHexColor(source.borderHover) ?? undefined,
    title: normalizeHexColor(source.title) ?? undefined,
    text: normalizeHexColor(source.text) ?? undefined,
    mutedText: normalizeHexColor(source.mutedText) ?? undefined,
    chipBackground: normalizeHexColor(source.chipBackground) ?? undefined,
    chipBorder: normalizeHexColor(source.chipBorder) ?? undefined,
    chipText: normalizeHexColor(source.chipText) ?? undefined,
  };

  const hasAnyValue = Object.values(theme).some(Boolean);
  return hasAnyValue ? theme : null;
}

function isThemePath(pathValue: unknown): pathValue is string {
  if (typeof pathValue !== 'string') {
    return false;
  }

  const normalized = pathValue.toLowerCase();
  return /(^|\/)(\.opencode\/)?themes\//.test(normalized) && normalized.endsWith('.json');
}

function getCardThemeFromSnapshot(storagePath: string | null | undefined, fileIndex: ParsedFileIndexEntry[] | null): BundleCardTheme | null {
  if (!storagePath || !fileIndex) {
    return null;
  }

  // In serverless deployments we may store snapshots in remote object storage.
  // This helper is intentionally best-effort and should never crash list endpoints.
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return null;
  }

  const themeEntry = fileIndex.find(
    (entry): entry is ParsedFileIndexEntry & { path: string } => isThemePath(entry.path)
  );
  const themePath = themeEntry?.path;
  if (!themePath) {
    return null;
  }

  let content: string | null = null;
  try {
    content = extractFileFromZip(storagePath, themePath);
  } catch {
    return null;
  }
  if (!content) {
    return null;
  }

  try {
    const parsed = parseJsonc(content, undefined, true);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const themeObj = parsed as Record<string, unknown>;
    const colors = themeObj.colors;
    const colorMap = (colors && typeof colors === 'object') ? (colors as Record<string, unknown>) : null;

    const background = normalizeHexColor(colorMap?.surface ?? colorMap?.background ?? themeObj.background);
    const border = normalizeHexColor(colorMap?.border ?? colorMap?.outline ?? colorMap?.primary);
    const title = normalizeHexColor(colorMap?.text ?? colorMap?.foreground ?? themeObj.text);
    const text = normalizeHexColor(colorMap?.mutedText ?? colorMap?.muted ?? colorMap?.text ?? themeObj.text);
    const chipBackground = normalizeHexColor(colorMap?.surface ?? colorMap?.background);
    const chipBorder = normalizeHexColor(colorMap?.primary ?? colorMap?.border);
    const chipText = normalizeHexColor(colorMap?.text ?? colorMap?.foreground);

    const theme: BundleCardTheme = {
      background: background ?? undefined,
      border: border ?? undefined,
      title: title ?? undefined,
      text: text ?? undefined,
      mutedText: text ?? undefined,
      chipBackground: chipBackground ?? undefined,
      chipBorder: chipBorder ?? undefined,
      chipText: chipText ?? undefined,
    };

    const hasAnyValue = Object.values(theme).some(Boolean);
    return hasAnyValue ? theme : null;
  } catch {
    return null;
  }
}

function getManifestOpencodeCompatibility(manifest: ParsedManifest | null): string {
  const compatibility = manifest?.compatibility;
  if (!compatibility || typeof compatibility !== 'object') {
    return '';
  }

  const opencode = (compatibility as Record<string, unknown>).opencode;
  return typeof opencode === 'string' ? opencode : '';
}

function inferArtifactType(entry: ParsedFileIndexEntry): string | null {
  if (typeof entry.kind === 'string' && ARTIFACT_TYPE_BY_KIND[entry.kind]) {
    return ARTIFACT_TYPE_BY_KIND[entry.kind];
  }

  if (typeof entry.path !== 'string') {
    return null;
  }

  const normalizedPath = entry.path.toLowerCase();
  const pathChecks: Array<[RegExp, string]> = [
    [/(^|\/)(\.opencode\/)?themes\//, 'themes'],
    [/(^|\/)(\.opencode\/)?commands?\//, 'commands'],
    [/(^|\/)(\.opencode\/)?agents?\//, 'agents'],
    [/(^|\/)(\.opencode\/)?modes?\//, 'modes'],
    [/(^|\/)(\.opencode\/)?skills\//, 'skills'],
    [/(^|\/)(\.opencode\/)?plugins?\//, 'plugins'],
    [/(^|\/)(\.opencode\/)?tools?\//, 'tools'],
    [/(^|\/)(\.opencode\/)?rules?\//, 'rules'],
    [/(^|\/)(\.opencode\/)?prompts?\//, 'prompts'],
    [/(^|\/)(\.opencode\/)?scripts?\//, 'scripts'],
  ];

  for (const [pattern, artifactType] of pathChecks) {
    if (pattern.test(normalizedPath)) {
      return artifactType;
    }
  }

  if (normalizedPath.endsWith('opencode.json') || normalizedPath.endsWith('opencode.jsonc')) {
    return 'config';
  }

  return null;
}

function getArtifactTypes(fileIndex: ParsedFileIndexEntry[] | null): string[] {
  if (!fileIndex || fileIndex.length === 0) {
    return [];
  }

  const uniqueTypes = new Set<string>();
  for (const entry of fileIndex) {
    const artifactType = inferArtifactType(entry);
    if (artifactType) {
      uniqueTypes.add(artifactType);
    }
  }

  return Array.from(uniqueTypes).sort();
}

function getRiskBadges(safetyResults: ParsedSafetyResults | null): string[] {
  if (!safetyResults || !Array.isArray(safetyResults.riskFlags)) {
    return [];
  }

  const uniqueBadges = new Set<string>();
  for (const riskFlag of safetyResults.riskFlags) {
    if (typeof riskFlag.flag === 'string' && riskFlag.flag.trim().length > 0) {
      uniqueBadges.add(riskFlag.flag);
    }
  }

  return Array.from(uniqueBadges);
}

export const publicBundlesRoute: FastifyPluginAsync = fp(async (fastify) => {
  // List public bundles for browse/home cards
  fastify.get('/api/bundles', async (request, reply) => {
    try {
      const query = request.query as BundleListQuery;

      const bundles = await db.select({
        id: publisherBundle.id,
        githubOwner: publisherBundle.githubOwner,
        githubRepo: publisherBundle.githubRepo,
        status: publisherBundle.status,
        manifestJson: publisherBundle.manifestJson,
        accentColor: publisherBundle.accentColor,
        stars: publisherBundle.stars,
        forks: publisherBundle.forks,
        createdAt: publisherBundle.createdAt,
        updatedAt: publisherBundle.updatedAt,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.status, 'registered'));

      const cards = await Promise.all(
        bundles.map(async (bundle) => {
          const latestSnapshot = await db.select({
            createdAt: snapshot.createdAt,
            fileIndex: snapshot.fileIndex,
            safetyResults: snapshot.safetyResults,
            storagePath: snapshot.storagePath,
          })
            .from(snapshot)
            .where(eq(snapshot.bundleId, bundle.id))
            .orderBy(desc(snapshot.createdAt))
            .limit(1);

          const manifest = parseJson<ParsedManifest>(bundle.manifestJson);
          const fileIndex = parseJson<ParsedFileIndexEntry[]>(latestSnapshot[0]?.fileIndex);
          const safetyResults = parseJson<ParsedSafetyResults>(latestSnapshot[0]?.safetyResults);

          const tags = toStringArray(manifest?.tags);
          const artifactTypes = getArtifactTypes(fileIndex);
          const riskBadges = getRiskBadges(safetyResults);
          const name = typeof manifest?.name === 'string' ? manifest.name : bundle.githubRepo;
          const summary = typeof manifest?.summary === 'string' ? manifest.summary : '';
          const slug = typeof manifest?.id === 'string' ? manifest.id : bundle.githubRepo;
          const opencodeCompatibility = getManifestOpencodeCompatibility(manifest);
          const manifestCardTheme = toBundleCardTheme(manifest?.cardTheme ?? manifest?.bundleCardTheme);
          const snapshotCardTheme = getCardThemeFromSnapshot(latestSnapshot[0]?.storagePath, fileIndex);
          const cardTheme = manifestCardTheme ?? snapshotCardTheme;
          const updatedAt = toIsoTimestamp(
            latestSnapshot[0]?.createdAt ?? bundle.updatedAt ?? bundle.createdAt
          );
          const updatedAtMs = new Date(updatedAt).getTime();

          const resolvedAccentColor = cardTheme
            ? (bundle.accentColor ?? cardTheme?.border ?? getDeterministicAccent(bundle.id))
            : null;

          const card: BundleCardResponse & {
            _searchIndex: string;
            _updatedAtMs: number;
            _opencodeCompatibility: string;
          } = {
            id: bundle.id,
            slug,
            name,
            summary,
            owner: bundle.githubOwner,
            ownerAvatarUrl: `https://github.com/${bundle.githubOwner}.png`,
            tags,
            artifactTypes,
            riskBadges,
            accentColor: resolvedAccentColor,
            cardTheme,
            stars: bundle.stars,
            forks: bundle.forks,
            updatedAt,
            _searchIndex: `${name} ${summary} ${tags.join(' ')}`.toLowerCase(),
            _updatedAtMs: Number.isNaN(updatedAtMs) ? 0 : updatedAtMs,
            _opencodeCompatibility: opencodeCompatibility.toLowerCase(),
          };

          return card;
        })
      );

      const qFilter = query.q?.trim().toLowerCase();
      const tagFilters = toQueryValues(query.tag);
      const typeFilters = toQueryValues(query.type);
      const opencodeFilter = query.opencode?.trim().toLowerCase();
      const sort = query.sort === 'newest' ? 'newest' : 'newest';
      const limit = Number.parseInt(query.limit ?? '', 10);

      const filteredCards = cards.filter((card) => {
        if (qFilter && !card._searchIndex.includes(qFilter)) {
          return false;
        }

        if (tagFilters.length > 0 && !card.tags.some((tag) => tagFilters.includes(tag.toLowerCase()))) {
          return false;
        }

        if (typeFilters.length > 0 && !card.artifactTypes.some((type) => typeFilters.includes(type.toLowerCase()))) {
          return false;
        }

        if (opencodeFilter && !card._opencodeCompatibility.includes(opencodeFilter)) {
          return false;
        }

        return true;
      });

      if (sort === 'newest') {
        filteredCards.sort((a, b) => b._updatedAtMs - a._updatedAtMs);
      }

      const limitedCards = Number.isFinite(limit) && limit > 0
        ? filteredCards.slice(0, limit)
        : filteredCards;

      return limitedCards.map(({ _searchIndex, _updatedAtMs, _opencodeCompatibility, ...card }) => card);
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
      reply.code(500);
      return { error: 'Failed to fetch bundles' };
    }
  });

  // Get bundle detail
  fastify.get('/api/bundles/:id', async (request, reply) => {
    try {
      const { id: identifier } = request.params as { id: string };
      const resolvedBundleId = await resolveBundleId(identifier);

      if (!resolvedBundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const bundle = await db.select({
        id: publisherBundle.id,
        githubFullName: publisherBundle.githubFullName,
        githubOwner: publisherBundle.githubOwner,
        githubRepo: publisherBundle.githubRepo,
        accentColor: publisherBundle.accentColor,
        stars: publisherBundle.stars,
        forks: publisherBundle.forks,
        status: publisherBundle.status,
        createdAt: publisherBundle.createdAt,
        updatedAt: publisherBundle.updatedAt,
        repoHtmlUrl: publisherBundle.repoHtmlUrl,
        manifestJson: publisherBundle.manifestJson,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.id, resolvedBundleId))
        .limit(1);

      if (!bundle || bundle.length === 0) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const bundleData = bundle[0];

      // Get latest snapshot with file index and safety results
      const latestSnapshot = await db.select({
        commitSha: snapshot.commitSha,
        createdAt: snapshot.createdAt,
        storagePath: snapshot.storagePath,
        fileIndex: snapshot.fileIndex,
        byteSize: snapshot.byteSize,
        safetyResults: snapshot.safetyResults,
      })
        .from(snapshot)
        .where(eq(snapshot.bundleId, resolvedBundleId))
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
        .where(eq(importRun.bundleId, resolvedBundleId))
        .orderBy(desc(importRun.finishedAt))
        .limit(1);

      let manifest = null;
      let fileIndex = null;
      let safetyResults = null;

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

      try {
        if (latestSnapshot[0]?.safetyResults) {
          safetyResults = JSON.parse(latestSnapshot[0].safetyResults);
        }
      } catch {
        // Invalid safety results JSON
      }

      const manifestCardTheme = toBundleCardTheme(manifest?.cardTheme ?? manifest?.bundleCardTheme);
      const snapshotCardTheme = getCardThemeFromSnapshot(latestSnapshot[0]?.storagePath, fileIndex);
      const cardTheme = manifestCardTheme ?? snapshotCardTheme;

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
        owner: bundleData.githubOwner,
        ownerAvatarUrl: `https://github.com/${bundleData.githubOwner}.png`,
        stars: bundleData.stars,
        forks: bundleData.forks,
        accentColor: bundleData.accentColor,
        status: bundleData.status,
        createdAt: bundleData.createdAt,
        updatedAt: bundleData.updatedAt,
        latestSnapshot: latestSnapshot[0] ? {
          commitSha: latestSnapshot[0].commitSha,
          createdAt: latestSnapshot[0].createdAt,
          byteSize: latestSnapshot[0].byteSize,
        } : null,
        fileIndex: fileIndex || [],
        cardTheme,
        safetyResults: safetyResults,
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
      const { id: identifier } = request.params as { id: string };
      const { path: filePath } = request.query as { path?: string };

      const resolvedBundleId = await resolveBundleId(identifier);
      if (!resolvedBundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      if (!filePath) {
        reply.code(400);
        return { error: 'Missing path parameter' };
      }

      // Get the bundle to verify it exists
      const bundle = await db.select({
        id: publisherBundle.id,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.id, resolvedBundleId))
        .limit(1);

      if (!bundle || bundle.length === 0) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      // Get the latest snapshot for this bundle
      const latestSnapshot = await db.select({
        storagePath: snapshot.storagePath,
        commitSha: snapshot.commitSha,
        fileIndex: snapshot.fileIndex,
      })
        .from(snapshot)
        .where(eq(snapshot.bundleId, resolvedBundleId))
        .orderBy(desc(snapshot.createdAt))
        .limit(1);

      if (!latestSnapshot || latestSnapshot.length === 0) {
        reply.code(404);
        return { error: 'No snapshot found for this bundle' };
      }

      const snapshotData = latestSnapshot[0];

      const localSnapshotPath = await materializeSnapshotToLocal({
        storagePath: snapshotData.storagePath,
        bundleId: resolvedBundleId,
        commitSha: snapshotData.commitSha,
      });

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
      const content = extractFileFromZip(localSnapshotPath, filePath);

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

  // Download bundle as ZIP (project or global layout)
  fastify.get('/api/bundles/:id/download', async (request, reply) => {
    try {
      const { id: identifier } = request.params as { id: string };
      const { variant } = request.query as { variant?: string };

      const resolvedBundleId = await resolveBundleId(identifier);
      if (!resolvedBundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      // Validate variant parameter
      if (!variant) {
        reply.code(400);
        return { error: 'Missing variant parameter. Use ?variant=project or ?variant=global' };
      }

      if (!isValidVariant(variant)) {
        reply.code(400);
        return { error: 'Invalid variant. Must be "project" or "global"' };
      }

      // Get the bundle to verify it exists and get slug for filename
      const bundle = await db.select({
        id: publisherBundle.id,
        githubRepo: publisherBundle.githubRepo,
      })
        .from(publisherBundle)
        .where(eq(publisherBundle.id, resolvedBundleId))
        .limit(1);

      if (!bundle || bundle.length === 0) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const bundleData = bundle[0];

      // Get the latest snapshot for this bundle
      const latestSnapshot = await db.select({
        storagePath: snapshot.storagePath,
        commitSha: snapshot.commitSha,
        safetyResults: snapshot.safetyResults,
      })
        .from(snapshot)
        .where(eq(snapshot.bundleId, resolvedBundleId))
        .orderBy(desc(snapshot.createdAt))
        .limit(1);

      if (!latestSnapshot || latestSnapshot.length === 0) {
        reply.code(404);
        return { error: 'No snapshot found for this bundle' };
      }

      const snapshotData = latestSnapshot[0];

      const localSnapshotPath = await materializeSnapshotToLocal({
        storagePath: snapshotData.storagePath,
        bundleId: resolvedBundleId,
        commitSha: snapshotData.commitSha,
      });

      // Generate the ZIP stream
      const { stream, filename } = generateZipStream(
        localSnapshotPath,
        variant,
        bundleData.githubRepo
      );

      // Set response headers
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);

      // Return the stream
      return stream;
    } catch (error) {
      console.error('Failed to generate download:', error);
      reply.code(500);
      return { error: 'Failed to generate download' };
    }
  });
}, {
  name: 'public-bundles-route',
});
