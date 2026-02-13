import AdmZip from 'adm-zip';
import path from 'path';

export interface FileIndexEntry {
  path: string;
  size: number;
  kind: 'config' | 'theme' | 'skill' | 'snippet' | 'script' | 'other';
  isBinary: boolean;
  isPreviewable: boolean;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp3', '.mp4', '.avi', '.mov', '.webm',
  '.wasm', '.node',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.jsonc',
  '.yaml', '.yml',
  '.md', '.mdx',
  '.css', '.scss', '.sass', '.less',
  '.html', '.htm',
  '.txt', '.log',
  '.sh', '.bash', '.zsh', '.fish',
  '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.hpp',
]);

function isBinaryFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function isPreviewableFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function getFileKind(filePath: string): FileIndexEntry['kind'] {
  const normalizedPath = filePath.toLowerCase();
  const fileName = path.basename(normalizedPath);
  
  // Config files
  if (fileName === 'opencode.json' || fileName === 'opendots.yml' || fileName === 'opendots.yaml') {
    return 'config';
  }
  
  // Theme files
  if (normalizedPath.includes('.opencode/themes/') || normalizedPath.includes('/themes/')) {
    return 'theme';
  }
  
  // Skill files
  if (normalizedPath.includes('/skills/') || fileName === 'skill.md' || fileName.endsWith('.skill.md')) {
    return 'skill';
  }
  
  // Snippet files
  if (normalizedPath.includes('/snippets/') || normalizedPath.includes('.opencode/snippets/')) {
    return 'snippet';
  }
  
  // Script files
  if (normalizedPath.includes('/scripts/') || normalizedPath.includes('.opencode/scripts/')) {
    return 'script';
  }
  
  return 'other';
}

export function buildFileIndex(zipPath: string): FileIndexEntry[] {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  const files: FileIndexEntry[] = [];
  
  for (const entry of entries) {
    // Skip directories
    if (entry.isDirectory) {
      continue;
    }
    
    const fileName = path.basename(entry.entryName);
    const isBinary = isBinaryFile(fileName);
    const isPreviewable = isPreviewableFile(fileName) && !isBinary;
    
    files.push({
      path: entry.entryName,
      size: entry.header.size,
      kind: getFileKind(entry.entryName),
      isBinary,
      isPreviewable,
    });
  }
  
  // Sort by path for consistent ordering
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  return files;
}

export function extractFileFromZip(zipPath: string, filePath: string): string | null {
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntry(filePath);
  
  if (!entry || entry.isDirectory) {
    return null;
  }
  
  return entry.getData().toString('utf-8');
}
