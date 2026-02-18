import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { dbInstance as db } from '../db/db.js';
import { publisherBundle } from '../db/schema/publisher.js';
import { snapshot, importRun } from '../db/schema/imports.js';
import { eq, desc } from 'drizzle-orm';
import { extractFileFromZip } from '../import/fileIndex.js';
import { generateZipStream, isValidVariant } from '../import/zipGenerator.js';
import { parse as parseJsonc } from 'comment-json';
import { materializeSnapshotToLocal } from '../storage/snapshots.js';

const MAX_PREVIEW_SIZE = 100 * 1024; // 100KB
const MAX_README_PREVIEW_SIZE = 1024 * 1024; // 1MB
const MAX_OVERVIEW_README_SIZE = 3 * 1024 * 1024; // 3MB
const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const OVERVIEW_MARKER_START = '<!-- OPENDOTS_AUTO_CONTENTS_START -->';
const OVERVIEW_MARKER_END = '<!-- OPENDOTS_AUTO_CONTENTS_END -->';

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
  shareCode: string;
  slug: string;
  name: string;
  summary: string;
  owner: string;
  ownerAvatarUrl: string;
  tags: string[];
  artifactTypes: string[];
  riskBadges: string[];
  safetyStatus: 'clean' | 'warning' | 'unknown';
  accentColor: string | null;
  cardTheme: BundleCardTheme | null;
  stars: number;
  forks: number;
  updatedAt: string;
}

interface BundleChangeSummary {
  latestCommitSha: string;
  previousCommitSha: string | null;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  addedPaths: string[];
  removedPaths: string[];
  changedPaths: string[];
}

function encodeHexToBase62(hex: string): string {
  let value = BigInt(`0x${hex}`);
  if (value === 0n) {
    return '0';
  }

  let out = '';
  while (value > 0n) {
    const remainder = Number(value % 62n);
    out = `${BASE62_ALPHABET[remainder]}${out}`;
    value /= 62n;
  }

  return out;
}

function decodeBase62ToHex(base62: string): string | null {
  let value = 0n;
  for (const character of base62) {
    const index = BASE62_ALPHABET.indexOf(character);
    if (index < 0) {
      return null;
    }
    value = (value * 62n) + BigInt(index);
  }

  return value.toString(16);
}

function normalizeUuidHex(uuid: string): string | null {
  const normalized = uuid.trim().toLowerCase().replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function toUuidStringFromHex(hex: string): string {
  const normalized = hex.padStart(32, '0').toLowerCase();
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function toBundleShareCode(bundleId: string): string {
  const normalizedHex = normalizeUuidHex(bundleId);
  if (!normalizedHex) {
    return bundleId;
  }

  return encodeHexToBase62(normalizedHex);
}

function bundleIdFromShareCode(code: string): string | null {
  const normalizedCode = code.trim();
  if (!/^[0-9A-Za-z]+$/.test(normalizedCode)) {
    return null;
  }

  const decodedHex = decodeBase62ToHex(normalizedCode);
  if (!decodedHex || decodedHex.length > 32) {
    return null;
  }

  return toUuidStringFromHex(decodedHex);
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
  size?: unknown;
  isBinary?: unknown;
}

interface ParsedSafetyResults {
  riskFlags?: Array<{ flag?: unknown }>;
  secretWarnings?: unknown[];
  validation?: {
    config?: {
      valid?: unknown;
      errors?: unknown;
      warnings?: unknown;
    } | null;
    themes?: Array<{ valid?: unknown }>;
    skills?: Array<{ valid?: unknown }>;
  };
}

interface ShareBundleMeta {
  bundleId: string;
  name: string;
  summary: string;
  owner: string;
  ownerAvatarUrl: string;
  tags: string[];
}

const MAX_CHANGE_SAMPLE_PATHS = 12;

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

function resolveThemeColorValue(theme: Record<string, unknown>, value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return resolveThemeColorToken(theme, value);
  }

  if (typeof value === 'object') {
    const palette = value as Record<string, unknown>;
    const preferred = [palette.dark, palette.light, palette.default, palette.primary, palette.accent];
    for (const candidate of preferred) {
      const resolved = resolveThemeColorToken(theme, candidate);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function pickThemeColor(theme: Record<string, unknown>, ...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    const resolved = resolveThemeColorValue(theme, candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
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

async function getCardThemeFromSnapshot(params: {
  storagePath: string | null | undefined;
  bundleId: string;
  commitSha: string | null | undefined;
  fileIndex: ParsedFileIndexEntry[] | null;
}): Promise<BundleCardTheme | null> {
  const { storagePath, bundleId, commitSha, fileIndex } = params;

  if (!storagePath || !fileIndex || !commitSha) {
    return null;
  }

  let localSnapshotPath = storagePath;
  try {
    localSnapshotPath = await materializeSnapshotToLocal({
      storagePath,
      bundleId,
      commitSha,
    });
  } catch {
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
    content = extractFileFromZip(localSnapshotPath, themePath);
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

    const nestedTheme = themeObj.theme;
    const nestedThemeMap = (nestedTheme && typeof nestedTheme === 'object')
      ? (nestedTheme as Record<string, unknown>)
      : null;

    const background = pickThemeColor(
      themeObj,
      colorMap?.surface,
      colorMap?.background,
      themeObj.background,
      nestedThemeMap?.background,
      nestedThemeMap?.backgroundPanel,
      nestedThemeMap?.backgroundElement,
    );
    const backgroundHover = pickThemeColor(
      themeObj,
      nestedThemeMap?.backgroundElement,
      nestedThemeMap?.backgroundPanel,
      colorMap?.surface,
      colorMap?.background,
    );
    const border = pickThemeColor(
      themeObj,
      colorMap?.border,
      colorMap?.outline,
      colorMap?.primary,
      nestedThemeMap?.border,
      nestedThemeMap?.primary,
      nestedThemeMap?.accent,
    );
    const borderHover = pickThemeColor(
      themeObj,
      nestedThemeMap?.borderActive,
      nestedThemeMap?.primary,
      nestedThemeMap?.accent,
      colorMap?.primary,
      colorMap?.border,
    );
    const title = pickThemeColor(
      themeObj,
      colorMap?.text,
      colorMap?.foreground,
      themeObj.text,
      nestedThemeMap?.text,
      nestedThemeMap?.markdownStrong,
    );
    const text = pickThemeColor(
      themeObj,
      colorMap?.mutedText,
      colorMap?.muted,
      colorMap?.text,
      themeObj.text,
      nestedThemeMap?.textMuted,
      nestedThemeMap?.text,
      nestedThemeMap?.markdownText,
    );
    const mutedText = pickThemeColor(
      themeObj,
      colorMap?.mutedText,
      colorMap?.muted,
      nestedThemeMap?.textMuted,
      nestedThemeMap?.diffContext,
      text,
    );
    const chipBackground = pickThemeColor(
      themeObj,
      colorMap?.surface,
      colorMap?.background,
      nestedThemeMap?.backgroundElement,
      nestedThemeMap?.backgroundPanel,
      nestedThemeMap?.background,
    );
    const chipBorder = pickThemeColor(
      themeObj,
      colorMap?.primary,
      colorMap?.border,
      nestedThemeMap?.primary,
      nestedThemeMap?.border,
      nestedThemeMap?.accent,
    );
    const chipText = pickThemeColor(
      themeObj,
      colorMap?.text,
      colorMap?.foreground,
      nestedThemeMap?.text,
      nestedThemeMap?.markdownText,
      nestedThemeMap?.markdownStrong,
    );

    const theme: BundleCardTheme = {
      background: background ?? undefined,
      backgroundHover: backgroundHover ?? undefined,
      border: border ?? undefined,
      borderHover: borderHover ?? undefined,
      title: title ?? undefined,
      text: text ?? undefined,
      mutedText: mutedText ?? undefined,
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

function hasValidationIssues(safetyResults: ParsedSafetyResults | null): boolean {
  const validation = safetyResults?.validation;
  if (!validation) {
    return false;
  }

  const config = validation.config;
  if (config && config.valid === false) {
    return true;
  }

  if (config && Array.isArray(config.errors) && config.errors.length > 0) {
    return true;
  }

  if (config && Array.isArray(config.warnings) && config.warnings.length > 0) {
    return true;
  }

  if (Array.isArray(validation.themes) && validation.themes.some((theme) => theme?.valid === false)) {
    return true;
  }

  if (Array.isArray(validation.skills) && validation.skills.some((skill) => skill?.valid === false)) {
    return true;
  }

  return false;
}

function getSafetyStatus(safetyResults: ParsedSafetyResults | null): 'clean' | 'warning' | 'unknown' {
  if (!safetyResults) {
    return 'unknown';
  }

  const hasRiskFlags = Array.isArray(safetyResults.riskFlags) && safetyResults.riskFlags.length > 0;
  const hasSecretWarnings = Array.isArray(safetyResults.secretWarnings) && safetyResults.secretWarnings.length > 0;
  if (hasRiskFlags || hasSecretWarnings || hasValidationIssues(safetyResults)) {
    return 'warning';
  }

  return 'clean';
}

function toComparableFileMap(fileIndex: ParsedFileIndexEntry[] | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!fileIndex) {
    return map;
  }

  for (const entry of fileIndex) {
    if (typeof entry.path !== 'string' || entry.path.trim().length === 0) {
      continue;
    }

    const path = entry.path;
    const size = typeof entry.size === 'number' ? entry.size : -1;
    const kind = typeof entry.kind === 'string' ? entry.kind : 'unknown';
    const isBinary = entry.isBinary === true ? '1' : '0';
    map.set(path, `${size}:${kind}:${isBinary}`);
  }

  return map;
}

function buildChangeSummary(
  latestFileIndex: ParsedFileIndexEntry[] | null,
  previousFileIndex: ParsedFileIndexEntry[] | null,
  latestCommitSha: string,
  previousCommitSha: string | null,
): BundleChangeSummary {
  const latestMap = toComparableFileMap(latestFileIndex);
  const previousMap = toComparableFileMap(previousFileIndex);

  const addedPaths: string[] = [];
  const removedPaths: string[] = [];
  const changedPaths: string[] = [];

  for (const [path, signature] of latestMap.entries()) {
    if (!previousMap.has(path)) {
      addedPaths.push(path);
      continue;
    }

    if (previousMap.get(path) !== signature) {
      changedPaths.push(path);
    }
  }

  for (const path of previousMap.keys()) {
    if (!latestMap.has(path)) {
      removedPaths.push(path);
    }
  }

  addedPaths.sort((a, b) => a.localeCompare(b));
  removedPaths.sort((a, b) => a.localeCompare(b));
  changedPaths.sort((a, b) => a.localeCompare(b));

  return {
    latestCommitSha,
    previousCommitSha,
    addedCount: addedPaths.length,
    removedCount: removedPaths.length,
    changedCount: changedPaths.length,
    addedPaths: addedPaths.slice(0, MAX_CHANGE_SAMPLE_PATHS),
    removedPaths: removedPaths.slice(0, MAX_CHANGE_SAMPLE_PATHS),
    changedPaths: changedPaths.slice(0, MAX_CHANGE_SAMPLE_PATHS),
  };
}

function getSiteBaseUrl() {
  const fromApp = process.env.APP_BASE_URL?.trim();
  if (fromApp) {
    return fromApp.replace(/\/$/, '');
  }

  const fromAuth = process.env.BETTER_AUTH_BASE_URL?.trim();
  if (fromAuth) {
    return fromAuth.replace(/\/$/, '');
  }

  return 'https://opendots.me';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isReadmePath(filePath: string): boolean {
  const normalized = filePath.trim().toLowerCase();
  return normalized === 'readme.md' || normalized.endsWith('/readme.md');
}

function getPreviewLimitForPath(filePath: string): number {
  return isReadmePath(filePath) ? MAX_README_PREVIEW_SIZE : MAX_PREVIEW_SIZE;
}

function findReadmePath(fileIndex: ParsedFileIndexEntry[] | null): string | null {
  if (!fileIndex || fileIndex.length === 0) {
    return null;
  }

  const entries = fileIndex
    .filter((entry): entry is ParsedFileIndexEntry & { path: string } => typeof entry.path === 'string')
    .map((entry) => entry.path);

  const exactRoot = entries.find((entry) => entry.toLowerCase() === 'readme.md');
  if (exactRoot) {
    return exactRoot;
  }

  const nested = entries
    .filter((entry) => entry.toLowerCase().endsWith('/readme.md'))
    .sort((a, b) => a.length - b.length);

  return nested[0] ?? null;
}

function extractOverviewMarkdown(readmeContent: string): { source: 'markers' | 'contents' | 'full'; markdown: string } {
  const markerStart = readmeContent.indexOf(OVERVIEW_MARKER_START);
  const markerEnd = readmeContent.indexOf(OVERVIEW_MARKER_END);
  if (markerStart >= 0 && markerEnd > markerStart) {
    const section = readmeContent
      .slice(markerStart + OVERVIEW_MARKER_START.length, markerEnd)
      .trim();

    if (section.length > 0) {
      return {
        source: 'markers',
        markdown: section,
      };
    }
  }

  const contentsMatch = readmeContent.match(/(?:^|\n)##\s+Contents\s*\n([\s\S]*?)(?:\n##\s+|\n#\s+|$)/i);
  if (contentsMatch?.[1]?.trim()) {
    return {
      source: 'contents',
      markdown: contentsMatch[1].trim(),
    };
  }

  return {
    source: 'full',
    markdown: readmeContent.trim(),
  };
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
            commitSha: snapshot.commitSha,
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
          const safetyStatus = getSafetyStatus(safetyResults);
          const name = typeof manifest?.name === 'string' ? manifest.name : bundle.githubRepo;
          const summary = typeof manifest?.summary === 'string' ? manifest.summary : '';
          const slug = typeof manifest?.id === 'string' ? manifest.id : bundle.githubRepo;
          const opencodeCompatibility = getManifestOpencodeCompatibility(manifest);
          const manifestCardTheme = toBundleCardTheme(manifest?.cardTheme ?? manifest?.bundleCardTheme);
          const snapshotCardTheme = await getCardThemeFromSnapshot({
            storagePath: latestSnapshot[0]?.storagePath,
            bundleId: bundle.id,
            commitSha: latestSnapshot[0]?.commitSha,
            fileIndex,
          });
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
            shareCode: toBundleShareCode(bundle.id),
            slug,
            name,
            summary,
            owner: bundle.githubOwner,
            ownerAvatarUrl: `https://github.com/${bundle.githubOwner}.png`,
            tags,
            artifactTypes,
            riskBadges,
            safetyStatus,
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

  async function resolveShareCodeToBundleId(code: string): Promise<string | null> {
    const decodedBundleId = bundleIdFromShareCode(code);

    let resolvedBundleId = decodedBundleId;
    if (!resolvedBundleId) {
      resolvedBundleId = await resolveBundleId(code);
    }

    if (!resolvedBundleId) {
      return null;
    }

    const bundle = await db.select({ id: publisherBundle.id })
      .from(publisherBundle)
      .where(eq(publisherBundle.id, resolvedBundleId))
      .limit(1);

    return bundle[0]?.id ?? null;
  }

  async function getShareBundleMeta(bundleId: string): Promise<ShareBundleMeta | null> {
    const rows = await db.select({
      id: publisherBundle.id,
      githubOwner: publisherBundle.githubOwner,
      githubRepo: publisherBundle.githubRepo,
      manifestJson: publisherBundle.manifestJson,
    })
      .from(publisherBundle)
      .where(eq(publisherBundle.id, bundleId))
      .limit(1);

    if (!rows[0]) {
      return null;
    }

    const row = rows[0];
    const manifest = parseJson<ParsedManifest>(row.manifestJson);
    const name = typeof manifest?.name === 'string' && manifest.name.trim().length > 0
      ? manifest.name.trim()
      : row.githubRepo;
    const summary = typeof manifest?.summary === 'string'
      ? manifest.summary.trim()
      : '';
    const tags = toStringArray(manifest?.tags);

    return {
      bundleId: row.id,
      name,
      summary,
      owner: row.githubOwner,
      ownerAvatarUrl: `https://github.com/${row.githubOwner}.png`,
      tags,
    };
  }

  // Resolve short share code to canonical bundle id.
  fastify.get('/api/share/:code', async (request, reply) => {
    try {
      const { code } = request.params as { code: string };
      const bundleId = await resolveShareCodeToBundleId(code);
      if (!bundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      return {
        bundleId,
      };
    } catch (error) {
      console.error('Failed to resolve share code:', error);
      reply.code(500);
      return { error: 'Failed to resolve share code' };
    }
  });

  // Redirect short share links for non-JS clients (bots, unfurlers).
  fastify.get('/api/share/:code/redirect', async (request, reply) => {
    try {
      const { code } = request.params as { code: string };
      const bundleId = await resolveShareCodeToBundleId(code);
      if (!bundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

      const bundleMeta = await getShareBundleMeta(bundleId);
      const siteBaseUrl = getSiteBaseUrl();
      const targetPath = `/bundle/${bundleId}`;
      const targetUrl = `${siteBaseUrl}${targetPath}`;
      const shareUrl = `${siteBaseUrl}/${code}`;

      const userAgent = String(request.headers['user-agent'] || '');
      const accept = String(request.headers.accept || '');
      const isCrawler = /(bot|crawler|spider|discordbot|slackbot|twitterbot|facebookexternalhit|linkedinbot|whatsapp|telegrambot|embedly|googlebot)/i.test(userAgent);
      const wantsHtml = accept.includes('text/html') || isCrawler;

      if (!wantsHtml || !bundleMeta) {
        return reply.redirect(targetPath, 302);
      }

      const title = escapeHtml(`${bundleMeta.name} · OpenDots Bundle`);
      const description = escapeHtml(
        bundleMeta.summary || `OpenDots bundle by @${bundleMeta.owner}${bundleMeta.tags.length > 0 ? ` · ${bundleMeta.tags.slice(0, 5).join(', ')}` : ''}`,
      );
      const ogImage = escapeHtml(bundleMeta.ownerAvatarUrl);
      const canonicalUrl = escapeHtml(shareUrl);
      const escapedTargetUrl = escapeHtml(targetUrl);

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="OpenDots" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta http-equiv="refresh" content="0;url=${escapedTargetUrl}" />
    <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapedTargetUrl}">${escapedTargetUrl}</a>...</p>
  </body>
</html>`;

      reply.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=120');
      reply.type('text/html; charset=utf-8');
      return html;
    } catch (error) {
      console.error('Failed to redirect share code:', error);
      reply.code(500);
      return { error: 'Failed to redirect share code' };
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

      // Get most recent snapshots for diff/change summary.
      const recentSnapshots = await db.select({
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
        .limit(2);

      const latestSnapshot = recentSnapshots[0] ?? null;
      const previousSnapshot = recentSnapshots[1] ?? null;

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
        if (latestSnapshot?.fileIndex) {
          fileIndex = JSON.parse(latestSnapshot.fileIndex);
        }
      } catch {
        // Invalid file index JSON
      }

      try {
        if (latestSnapshot?.safetyResults) {
          safetyResults = JSON.parse(latestSnapshot.safetyResults);
        }
      } catch {
        // Invalid safety results JSON
      }

      let previousFileIndex: ParsedFileIndexEntry[] | null = null;
      try {
        if (previousSnapshot?.fileIndex) {
          previousFileIndex = JSON.parse(previousSnapshot.fileIndex);
        }
      } catch {
        // Ignore invalid previous snapshot file index.
      }

      const changeSummary = latestSnapshot
        ? buildChangeSummary(
          fileIndex,
          previousFileIndex,
          latestSnapshot.commitSha,
          previousSnapshot?.commitSha ?? null,
        )
        : null;

      const manifestCardTheme = toBundleCardTheme(manifest?.cardTheme ?? manifest?.bundleCardTheme);
      const snapshotCardTheme = await getCardThemeFromSnapshot({
        storagePath: latestSnapshot?.storagePath,
        bundleId: resolvedBundleId,
        commitSha: latestSnapshot?.commitSha,
        fileIndex,
      });
      const cardTheme = manifestCardTheme ?? snapshotCardTheme;

      return {
        id: bundleData.id,
        shareCode: toBundleShareCode(bundleData.id),
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
        latestSnapshot: latestSnapshot ? {
          commitSha: latestSnapshot.commitSha,
          createdAt: latestSnapshot.createdAt,
          byteSize: latestSnapshot.byteSize,
        } : null,
        fileIndex: fileIndex || [],
        cardTheme,
        safetyResults: safetyResults,
        safetyStatus: getSafetyStatus(safetyResults),
        changeSummary,
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
        
        if (fileEntry.isBinary) {
          reply.code(400);
          return { error: 'File is not previewable (binary file)' };
        }
        
        const previewLimit = getPreviewLimitForPath(filePath);
        if (fileEntry.size > previewLimit) {
          reply.code(413);
          return {
            error: `File too large to preview (max ${Math.round(previewLimit / 1024)}KB)`,
          };
        }
      }

      // Extract file content from zip
      const content = extractFileFromZip(localSnapshotPath, filePath);

      if (content === null) {
        reply.code(404);
        return { error: 'File not found in snapshot' };
      }

      // Check content size
      const previewLimit = getPreviewLimitForPath(filePath);
      const contentByteLength = Buffer.byteLength(content, 'utf8');
      if (contentByteLength > previewLimit) {
        reply.code(413);
        return {
          error: `File too large to preview (max ${Math.round(previewLimit / 1024)}KB)`,
        };
      }

      reply.header('Content-Type', 'text/plain; charset=utf-8');
      return content;
    } catch (error) {
      console.error('Failed to fetch file:', error);
      reply.code(500);
      return { error: 'Failed to fetch file' };
    }
  });

  // Get README overview content without strict file preview limits.
  fastify.get('/api/bundles/:id/overview', async (request, reply) => {
    try {
      const { id: identifier } = request.params as { id: string };
      const resolvedBundleId = await resolveBundleId(identifier);
      if (!resolvedBundleId) {
        reply.code(404);
        return { error: 'Bundle not found' };
      }

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
      const fileIndex = parseJson<ParsedFileIndexEntry[]>(snapshotData.fileIndex);
      const readmePath = findReadmePath(fileIndex);
      if (!readmePath) {
        reply.code(404);
        return { error: 'README not found in bundle snapshot' };
      }

      const readmeEntry = fileIndex?.find((entry) => entry.path === readmePath);
      if (typeof readmeEntry?.size === 'number' && readmeEntry.size > MAX_OVERVIEW_README_SIZE) {
        reply.code(413);
        return { error: 'README too large for overview extraction' };
      }

      const localSnapshotPath = await materializeSnapshotToLocal({
        storagePath: snapshotData.storagePath,
        bundleId: resolvedBundleId,
        commitSha: snapshotData.commitSha,
      });

      const readmeContent = extractFileFromZip(localSnapshotPath, readmePath);
      if (readmeContent === null) {
        reply.code(404);
        return { error: 'README not found in snapshot' };
      }

      const extracted = extractOverviewMarkdown(readmeContent);
      return {
        readmePath,
        source: extracted.source,
        markdown: extracted.markdown,
      };
    } catch (error) {
      console.error('Failed to fetch bundle overview:', error);
      reply.code(500);
      return { error: 'Failed to fetch bundle overview' };
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
