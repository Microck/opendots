import AdmZip from 'adm-zip';
import path from 'path';

export interface FileIndexEntry {
  path: string;
  size: number;
  kind: 'config' | 'theme' | 'skill' | 'agent' | 'command' | 'plugin' | 'tool' | 'prompt' | 'mode' | 'rules' | 'script' | 'other';
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

const EXTENSIONLESS_TEXT_FILES = new Set([
  'makefile',
  'dockerfile',
  'brewfile',
  'justfile',
  'readme',
  'license',
  'licence',
]);

function isBinaryFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function isPreviewableFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (!ext) {
    return EXTENSIONLESS_TEXT_FILES.has(fileName.toLowerCase());
  }
  return TEXT_EXTENSIONS.has(ext);
}

function getFileKind(filePath: string): FileIndexEntry['kind'] {
  const pathParts = filePath.split('/').filter(Boolean);
  const relativePath = pathParts.length > 1 ? pathParts.slice(1).join('/') : filePath;
  const normalizedPath = relativePath.toLowerCase();
  const fileName = path.basename(relativePath); // Keep original case for AGENTS.md etc.
  const fileNameLower = fileName.toLowerCase();

  // Common dotfiles at repo root
  if ([
    '.zshrc',
    '.bashrc',
    '.bash_profile',
    '.profile',
    '.bash_aliases',
    '.aliases',
    '.tmux.conf',
  ].includes(fileNameLower)) {
    return 'script';
  }

  if (['.gitconfig', '.vimrc', '.editorconfig', '.npmrc'].includes(fileNameLower)) {
    return 'config';
  }
  
  // Config files at root
  if (fileNameLower === 'opencode.json' || fileNameLower === 'opencode.jsonc' || 
      fileNameLower === 'opendots.yml' || fileNameLower === 'opendots.yaml') {
    return 'config';
  }
  
  // Rules files (AGENTS.md, CLAUDE.md at any level)
  if (fileName === 'AGENTS.md' || fileName === 'CLAUDE.md') {
    return 'rules';
  }
  
  // Theme files - under themes/ or .opencode/themes/
  if (normalizedPath.match(/^(\.opencode\/)?themes\//)) {
    return 'theme';
  }
  
  // Agent definitions - under agent/ or .opencode/agents/
  if (normalizedPath.match(/^(\.opencode\/)?agents?\//)) {
    return 'agent';
  }
  
  // Command definitions - under command/ or commands/ or .opencode/commands/
  if (normalizedPath.match(/^(\.opencode\/)?commands?\//)) {
    return 'command';
  }

  // Disabled plugin stash - under disabled-plugins/ or .opencode/disabled-plugins/
  if (normalizedPath.match(/^(\.opencode\/)?disabled-plugins\//)) {
    return 'plugin';
  }

  // Plugin files - under plugins/ or .opencode/plugins/
  if (normalizedPath.match(/^(\.opencode\/)?plugins?\//)) {
    return 'plugin';
  }
  
  // Tool files - under tools/ or .opencode/tools/
  if (normalizedPath.match(/^(\.opencode\/)?tools?\//)) {
    return 'tool';
  }
  
  // Skill files - under skills/ or has SKILL.md name
  if (normalizedPath.match(/^(\.opencode\/)?skills\//) || fileNameLower === 'skill.md') {
    return 'skill';
  }
  
  // Prompt files - under prompts/
  if (normalizedPath.match(/^(\.opencode\/)?prompts?\//)) {
    return 'prompt';
  }
  
  // Mode definitions - under modes/
  if (normalizedPath.match(/^(\.opencode\/)?modes?\//)) {
    return 'mode';
  }
  
  // Script files
  if (normalizedPath.match(/^(\.opencode\/)?scripts?\//)) {
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
