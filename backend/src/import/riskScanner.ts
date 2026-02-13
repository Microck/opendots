import * as fs from 'fs/promises';
import * as path from 'path';

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskFlag {
  flag: string;
  description: string;
  files: string[];
  severity: RiskSeverity;
}

// Risk detection patterns
const RISK_PATTERNS = {
  // EXEC: Files containing exec, spawn, child_process
  EXEC: {
    pattern: /(?:exec|execSync|spawn|fork|child_process)\s*\(/gi,
    description: 'Contains process execution calls',
    severity: 'high' as RiskSeverity,
  },
  // SHELL: Shell scripts and shell command patterns
  SHELL: {
    pattern: /(?:^#![\/\w]*\/(?:ba)?sh|!\s*[\w-]+)/m,
    description: 'Contains shell commands or shell scripts',
    severity: 'medium' as RiskSeverity,
  },
  // REMOTE: URLs to external resources
  REMOTE: {
    pattern: /(?:https?|ftp):\/\/[^\s\"]+/gi,
    description: 'Contains remote URLs',
    severity: 'low' as RiskSeverity,
  },
  // EVAL: eval() or Function() constructor
  EVAL: {
    pattern: /(?:eval|Function|new\s+Function)\s*\(/gi,
    description: 'Contains dynamic code evaluation',
    severity: 'high' as RiskSeverity,
  },
};

// File extensions that should be scanned
const SCANNABLE_EXTENSIONS = new Set([
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.mjs',
  '.cjs',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.groovy',
  '.ps1',
  '.bat',
  '.cmd',
  '.yml',
  '.yaml',
  '.json',
  '.jsonc',
  '.md',
  '.txt',
  '', // Files with no extension (like shebang scripts)
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
];

// Max file size to scan (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Scans snapshot directory for risk flags
 */
export async function scanForRisks(snapshotPath: string): Promise<RiskFlag[]> {
  const flags = new Map<string, RiskFlag>();

  await scanDirectory(snapshotPath, snapshotPath, flags);

  return Array.from(flags.values());
}

/**
 * Recursively scan directory for risk patterns
 */
async function scanDirectory(
  dirPath: string,
  snapshotRoot: string,
  flags: Map<string, RiskFlag>
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
      await scanDirectory(fullPath, snapshotRoot, flags);
    } else if (entry.isFile()) {
      await scanFile(fullPath, relativePath, flags);
    }
  }
}

/**
 * Scan a single file for risk patterns
 */
async function scanFile(
  filePath: string,
  relativePath: string,
  flags: Map<string, RiskFlag>
): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();

  // Skip binary or non-scannable files
  if (!isScannableFile(ext, relativePath)) {
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

  // Read and scan file content
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return;
  }

  // Check each risk pattern
  for (const [flagKey, config] of Object.entries(RISK_PATTERNS)) {
    const matches = content.match(config.pattern);

    if (matches && matches.length > 0) {
      if (!flags.has(flagKey)) {
        flags.set(flagKey, {
          flag: flagKey,
          description: config.description,
          severity: config.severity,
          files: [],
        });
      }

      const flag = flags.get(flagKey)!;
      if (!flag.files.includes(relativePath)) {
        flag.files.push(relativePath);
      }
    }
  }
}

/**
 * Check if a file should be scanned based on extension
 */
function isScannableFile(ext: string, relativePath: string): boolean {
  // Always scan shell scripts based on extension
  if (['.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'].includes(ext)) {
    return true;
  }

  // Check if extension is in scannable list
  if (SCANNABLE_EXTENSIONS.has(ext)) {
    return true;
  }

  // Check for shebang files (no extension but executable)
  if (ext === '' && !relativePath.includes('.')) {
    return true;
  }

  return false;
}

/**
 * Get risk severity summary
 */
export function getRiskSummary(flags: RiskFlag[]): {
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  return {
    high: flags.filter((f) => f.severity === 'high').length,
    medium: flags.filter((f) => f.severity === 'medium').length,
    low: flags.filter((f) => f.severity === 'low').length,
    total: flags.length,
  };
}
