import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { PassThrough } from 'stream';

export type ZipVariant = 'project' | 'global';

interface ZipEntry {
  path: string;
  data: Buffer;
}

/**
 * Normalize a file path for security:
 * - Strip leading slashes
 * - Reject paths containing .. segments (zip-slip prevention)
 * - Return null if unsafe
 */
function normalizePath(filePath: string): string | null {
  // Strip leading slashes
  let normalized = filePath.replace(/^[\/]+/, '');
  
  // Reject paths with .. segments (zip-slip prevention)
  const parts = normalized.split(/[\/\\]/);
  if (parts.some(part => part === '..')) {
    return null;
  }
  
  return normalized;
}

/**
 * Determine the output path for a file based on the ZIP variant
 */
function getOutputPath(entryPath: string, variant: ZipVariant): string | null {
  const normalized = normalizePath(entryPath);
  if (normalized === null) return null;
  
  if (variant === 'project') {
    // Project layout: preserve structure as-is
    // Root opencode.json* stays at root
    // .opencode/ directory tree preserved as-is
    return normalized;
  } else {
    // Global layout: remap .opencode/ contents to top-level
    // Extracting into ~/.config/opencode/ should work directly
    if (normalized.startsWith('.opencode/')) {
      // Remove .opencode/ prefix
      return normalized.slice('.opencode/'.length);
    } else if (normalized === '.opencode') {
      // Skip the .opencode directory itself
      return null;
    } else {
      // Root-level files (like opencode.json) stay at root
      return normalized;
    }
  }
}

/**
 * Generate a ZIP stream for the specified variant from a source zip file
 * @param sourceZipPath - Path to the source snapshot zip
 * @param variant - 'project' or 'global' layout
 * @param bundleSlug - For the filename
 * @returns A readable stream of the generated ZIP
 */
export function generateZipStream(
  sourceZipPath: string,
  variant: ZipVariant,
  bundleSlug: string
): { stream: PassThrough; filename: string } {
  const passThrough = new PassThrough();
  const archive = archiver('zip', {
    zlib: { level: 6 },
  });
  
  // Pipe archive to pass-through stream
  archive.pipe(passThrough);
  
  // Handle archive errors
  archive.on('error', (err) => {
    passThrough.emit('error', err);
  });
  
  // Open source zip
  const sourceZip = new AdmZip(sourceZipPath);
  const entries = sourceZip.getEntries();
  
  // Process each entry
  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) {
      continue;
    }
    
    const outputPath = getOutputPath(entry.entryName, variant);
    if (outputPath === null) {
      // Skip unsafe paths
      continue;
    }
    
    // Add to archive
    archive.append(entry.getData(), { name: outputPath });
  }
  
  // Finalize archive
  archive.finalize();
  
  const filename = `${bundleSlug}-${variant}.zip`;
  
  return { stream: passThrough, filename };
}

/**
 * Validate that a variant string is valid
 */
export function isValidVariant(variant: string): variant is ZipVariant {
  return variant === 'project' || variant === 'global';
}
