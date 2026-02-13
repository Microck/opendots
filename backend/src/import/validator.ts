import Ajv from 'ajv';
import { parse as parseJsonc } from 'comment-json';
import matter from 'gray-matter';
import * as fs from 'fs/promises';
import * as path from 'path';

// Minimal embedded schema for opencode.json - based on OpenCode documentation
const OPENCODE_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    version: { type: 'string' },
    compatibility: { type: 'string' },
    mode: {
      type: 'string',
      enum: ['strict', 'lax', 'yolo'],
    },
    theme: { type: 'string' },
    agents: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          model: { type: 'string' },
        },
      },
    },
    commands: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  required: ['name'],
};

// Minimal embedded schema for OpenCode themes
const THEME_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    colors: {
      type: 'object',
      properties: {
        primary: { type: 'string' },
        secondary: { type: 'string' },
        background: { type: 'string' },
        foreground: { type: 'string' },
        accent: { type: 'string' },
      },
    },
    tokens: {
      type: 'object',
    },
  },
  required: ['name', 'colors'],
};

// SKILL.md frontmatter required fields
const SKILL_REQUIRED_FIELDS = ['name', 'description'];

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ThemeValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

export interface SkillValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

export interface ValidationResult {
  config: ConfigValidationResult | null;
  themes: ThemeValidationResult[];
  skills: SkillValidationResult[];
}

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

/**
 * Validates all OpenCode artifacts in a snapshot directory
 */
export async function validateSnapshot(snapshotPath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    config: null,
    themes: [],
    skills: [],
  };

  // Validate config files (opencode.json or opencode.jsonc)
  result.config = await validateConfigFiles(snapshotPath);

  // Validate theme JSON files
  result.themes = await validateThemeFiles(snapshotPath);

  // Validate SKILL.md files
  result.skills = await validateSkillFiles(snapshotPath);

  return result;
}

/**
 * Validates opencode.json or opencode.jsonc against schema
 */
async function validateConfigFiles(snapshotPath: string): Promise<ConfigValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const configFiles = ['opencode.json', 'opencode.jsonc'];
  let foundConfig = false;

  for (const configFile of configFiles) {
    const configPath = path.join(snapshotPath, configFile);

    try {
      await fs.access(configPath);
      foundConfig = true;

      const content = await fs.readFile(configPath, 'utf-8');
      let parsed: unknown;

      try {
        // Parse JSONC (strips comments) or regular JSON
        parsed = parseJsonc(content, undefined, true);
      } catch (parseError) {
        errors.push(`Failed to parse ${configFile}: ${(parseError as Error).message}`);
        continue;
      }

      // Validate against schema
      const validate = ajv.compile(OPENCODE_CONFIG_SCHEMA);
      const valid = validate(parsed);

      if (!valid) {
        for (const err of validate.errors || []) {
          errors.push(`${configFile}: ${err.instancePath || 'root'} - ${err.message}`);
        }
      }
    } catch {
      // File doesn't exist, continue to next
    }
  }

  if (!foundConfig) {
    warnings.push('No opencode.json or opencode.jsonc found in bundle');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates theme JSON files in the snapshot
 */
async function validateThemeFiles(snapshotPath: string): Promise<ThemeValidationResult[]> {
  const results: ThemeValidationResult[] = [];

  // Common theme directories and patterns
  const themeDirs = [
    path.join(snapshotPath, '.opencode', 'themes'),
    path.join(snapshotPath, 'themes'),
  ];

  for (const themeDir of themeDirs) {
    try {
      await fs.access(themeDir);
      const entries = await fs.readdir(themeDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(themeDir, entry.name);
          const relativePath = path.relative(snapshotPath, filePath);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(content);

            const validate = ajv.compile(THEME_SCHEMA);
            const valid = validate(parsed);

            if (valid) {
              results.push({
                file: relativePath,
                valid: true,
                errors: [],
              });
            } else {
              const errors: string[] = [];
              for (const err of validate.errors || []) {
                errors.push(`${err.instancePath || 'root'} - ${err.message}`);
              }
              results.push({
                file: relativePath,
                valid: false,
                errors,
              });
            }
          } catch (parseError) {
            results.push({
              file: relativePath,
              valid: false,
              errors: [`Failed to parse JSON: ${(parseError as Error).message}`],
            });
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return results;
}

/**
 * Validates SKILL.md files for proper frontmatter
 */
async function validateSkillFiles(snapshotPath: string): Promise<SkillValidationResult[]> {
  const results: SkillValidationResult[] = [];

  // Common skill directories and patterns
  const skillDirs = [
    path.join(snapshotPath, '.opencode', 'skills'),
    path.join(snapshotPath, 'skills'),
  ];

  for (const skillDir of skillDirs) {
    try {
      await fs.access(skillDir);
      const entries = await fs.readdir(skillDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name === 'SKILL.md') {
          const filePath = path.join(skillDir, entry.name);
          const relativePath = path.relative(snapshotPath, filePath);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = matter(content);
            const errors: string[] = [];

            // Check required fields
            for (const field of SKILL_REQUIRED_FIELDS) {
              if (!parsed.data[field] || parsed.data[field].trim?.() === '') {
                errors.push(`Missing or empty required frontmatter field: ${field}`);
              }
            }

            results.push({
              file: relativePath,
              valid: errors.length === 0,
              errors,
            });
          } catch (parseError) {
            results.push({
              file: relativePath,
              valid: false,
              errors: [`Failed to parse frontmatter: ${(parseError as Error).message}`],
            });
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  // Also check for SKILL.md at root level
  const rootSkillPath = path.join(snapshotPath, 'SKILL.md');
  try {
    await fs.access(rootSkillPath);
    const content = await fs.readFile(rootSkillPath, 'utf-8');
    const parsed = matter(content);
    const errors: string[] = [];

    for (const field of SKILL_REQUIRED_FIELDS) {
      if (!parsed.data[field] || parsed.data[field].trim?.() === '') {
        errors.push(`Missing or empty required frontmatter field: ${field}`);
      }
    }

    results.push({
      file: 'SKILL.md',
      valid: errors.length === 0,
      errors,
    });
  } catch {
    // File doesn't exist at root, that's fine
  }

  return results;
}

/**
 * Utility to check if a file is a valid config file
 */
export function isConfigFile(filename: string): boolean {
  return filename === 'opencode.json' || filename === 'opencode.jsonc';
}

/**
 * Utility to check if a file is a theme file
 */
export function isThemeFile(filename: string): boolean {
  return filename.endsWith('.json') && (
    filename.includes('theme') ||
    filename.toLowerCase().includes('color')
  );
}

/**
 * Utility to check if a file is a skill file
 */
export function isSkillFile(filename: string): boolean {
  return filename === 'SKILL.md';
}
