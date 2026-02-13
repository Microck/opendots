import * as fs from 'fs/promises';
import * as path from 'path';

export interface SecretWarning {
  file: string;
  line: number;
  pattern: string;
  snippet: string;
}

// Best-effort secret detection patterns
// These are intentionally conservative - we want to catch obvious issues
// without creating too many false positives
const SECRET_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
}> = [
  {
    name: 'AWS Access Key ID',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    description: 'AWS access key ID pattern detected',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    description: 'Private key block detected',
  },
  {
    name: 'GitHub Token',
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
    description: 'GitHub personal access token pattern detected',
  },
  {
    name: 'GitLab Token',
    pattern: /\bglpat-[a-zA-Z0-9\-]{20}\b/g,
    description: 'GitLab personal access token pattern detected',
  },
  {
    name: 'Slack Token',
    pattern: /\bxox[baprs]-[a-zA-Z0-9\-]+\b/g,
    description: 'Slack token pattern detected',
  },
  {
    name: 'Stripe Key',
    pattern: /\bsk_(test|live)_[a-zA-Z0-9]{24,}\b/g,
    description: 'Stripe secret key pattern detected',
  },
  {
    name: 'Generic API Key',
    pattern: /\b(api[_-]?key|apikey)\s*[:=]\s*["\']?[a-zA-Z0-9_\-]{16,}["\']?/gi,
    description: 'Potential API key pattern detected',
  },
  {
    name: 'Connection String with Password',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:\s]+:[^@\s]+@/gi,
    description: 'Connection string with embedded password detected',
  },
  {
    name: 'Bearer Token',
    pattern: /\b[Bb]earer\s+[a-zA-Z0-9_\-\.]{20,}\b/g,
    description: 'Bearer token pattern detected',
  },
  {
    name: 'Password Assignment',
    pattern: /\b(password|passwd|pwd)\s*[:=]\s*["\'][^"\']{8,}["\']/gi,
    description: 'Hardcoded password assignment detected',
  },
];

// File extensions to scan
const SCANNABLE_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.yml',
  '.yaml',
  '.env',
  '.conf',
  '.config',
  '.ini',
  '.toml',
  '.sh',
  '.bash',
  '.zsh',
  '.py',
  '.rb',
  '.php',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.md',
  '.txt',
  '.sql',
  '.xml',
  '.properties',
  '',
]);

// Files to skip
const SKIP_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /\.svn\//,
  /\.hg\//,
  /vendor\//,
  /dist\//,
  /build\//,
  /\.next\//,
  /coverage\//,
  /__pycache__\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

// Max file size to scan (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Scans snapshot directory for potential secrets
 * This is best-effort only - not a guarantee of security
 */
export async function scanForSecrets(snapshotPath: string): Promise<SecretWarning[]> {
  const warnings: SecretWarning[] = [];

  await scanDirectory(snapshotPath, snapshotPath, warnings);

  return warnings;
}

/**
 * Recursively scan directory for secret patterns
 */
async function scanDirectory(
  dirPath: string,
  snapshotRoot: string,
  warnings: SecretWarning[]
): Promise<void> {
  let entries;

  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(snapshotRoot, fullPath);

    // Skip ignored patterns
    if (SKIP_PATTERNS.some((p) => p.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      await scanDirectory(fullPath, snapshotRoot, warnings);
    } else if (entry.isFile()) {
      await scanFile(fullPath, relativePath, warnings);
    }
  }
}

/**
 * Scan a single file for secret patterns
 */
async function scanFile(
  filePath: string,
  relativePath: string,
  warnings: SecretWarning[]
): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath).toLowerCase();

  // Skip non-scannable files
  if (!isScannableFile(ext, basename)) {
    return;
  }

  // Check file size
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return;
    }
  } catch {
    return;
  }

  // Read file content
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  // Scan each line for patterns
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const { name, pattern, description } of SECRET_PATTERNS) {
      // Reset pattern lastIndex for global regex
      pattern.lastIndex = 0;

      const matches = line.match(pattern);
      if (matches) {
        // Redact the actual matched value, show only context
        const redactedLine = redactSecrets(line, pattern);
        const snippet = redactedLine.trim().substring(0, 100);

        warnings.push({
          file: relativePath,
          line: lineNum + 1,
          pattern: `${name}: ${description}`,
          snippet,
        });
      }
    }
  }
}

/**
 * Check if a file should be scanned
 */
function isScannableFile(ext: string, basename: string): boolean {
  // Always scan .env files
  if (basename.startsWith('.env')) {
    return true;
  }

  // Check extension
  if (SCANNABLE_EXTENSIONS.has(ext)) {
    return true;
  }

  // Scan files without extension
  if (ext === '') {
    return true;
  }

  return false;
}

/**
 * Redact secret values from a line
 */
function redactSecrets(line: string, pattern: RegExp): string {
  // Create a new regex without global flag for replacement
  const localPattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));

  // Replace matched patterns with [REDACTED]
  return line.replace(localPattern, '[REDACTED]');
}

/**
 * Get summary statistics for secret scan
 */
export function getSecretScanSummary(warnings: SecretWarning[]): {
  totalWarnings: number;
  filesWithWarnings: number;
  patternsFound: string[];
} {
  const files = new Set(warnings.map((w) => w.file));
  const patterns = new Set(warnings.map((w) => w.pattern.split(':')[0]));

  return {
    totalWarnings: warnings.length,
    filesWithWarnings: files.size,
    patternsFound: Array.from(patterns),
  };
}

/**
 * Disclaimer message for secret scanning
 */
export const SECRET_SCAN_DISCLAIMER =
  'Secret scanning is best-effort only and not guaranteed to detect all secrets. ' +
  'Users are responsible for reviewing bundle contents before installation.';
