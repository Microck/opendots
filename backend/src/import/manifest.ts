import { z } from 'zod';
import yaml from 'js-yaml';

export interface OpendotsManifest {
  id: string;
  name: string;
  summary: string;
  license: string;
  [key: string]: any;
}

export const opendotsManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  license: z.string().min(1),
}).passthrough();

export interface ManifestValidationError {
  field?: string;
  message: string;
}

export function parseManifest(content: string, format: 'yaml' | 'json'): OpendotsManifest {
  let parsed: any;

  if (format === 'yaml') {
    parsed = yaml.load(content);
  } else {
    parsed = JSON.parse(content);
  }

  const result = opendotsManifestSchema.safeParse(parsed);

  if (!result.success) {
    const firstError = result.error.issues[0];
    throw {
      field: firstError.path.join('.'),
      message: firstError.message,
    } as ManifestValidationError;
  }

  return result.data;
}

export async function fetchAndValidateManifest(
  getFileContent: (owner: string, repo: string, path: string) => Promise<string | null>,
  owner: string,
  repo: string
): Promise<OpendotsManifest | ManifestValidationError> {
  const yamlContent = await getFileContent(owner, repo, 'opendots.yml');

  if (yamlContent === null) {
    const jsonContent = await getFileContent(owner, repo, 'opendots.json');
    if (jsonContent === null) {
      return {
        field: 'manifest',
        message: 'opendots.yml or opendots.json not found in repository root',
      };
    }
    try {
      return parseManifest(jsonContent, 'json');
    } catch (error: any) {
      return error as ManifestValidationError;
    }
  }

  try {
    return parseManifest(yamlContent, 'yaml');
  } catch (error: any) {
    return error as ManifestValidationError;
  }
}
