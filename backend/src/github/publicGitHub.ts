export interface PublicGitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: { login: string };
  default_branch: string | null;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id: string } | null;
}

async function fetchGitHubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      // GitHub requires a user agent and behaves better with explicit accept.
      'User-Agent': 'opendots',
      'Accept': 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`GitHub request failed (${response.status}): ${body || response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export async function getPublicRepoInfo(owner: string, repo: string): Promise<PublicGitHubRepoInfo | null> {
  try {
    return await fetchGitHubJson<PublicGitHubRepoInfo>(`https://api.github.com/repos/${owner}/${repo}`);
  } catch (error: any) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getPublicHeadCommitSha(owner: string, repo: string, ref: string): Promise<string | null> {
  try {
    const data = await fetchGitHubJson<{ sha?: string }>(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`);
    return typeof data.sha === 'string' && data.sha.length > 0 ? data.sha : null;
  } catch (error: any) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getPublicFileContent(params: {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}): Promise<string | null> {
  const { owner, repo, ref, path } = params;

  // raw.githubusercontent.com treats the ref as a path segment. Some branches can contain slashes,
  // so we must encode per segment (not encode the slash itself).
  const safeRef = ref.split('/').map(encodeURIComponent).join('/');
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${safeRef}/${safePath}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'opendots',
      'Accept': 'text/plain',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`GitHub raw content fetch failed (${response.status}): ${body || response.statusText}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.text();
}

export async function downloadPublicZipball(params: {
  owner: string;
  repo: string;
  ref: string;
  timeoutMs: number;
}): Promise<Buffer> {
  const { owner, repo, ref, timeoutMs } = params;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // This endpoint redirects to codeload and works for public repos without auth.
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'opendots',
        'Accept': 'application/vnd.github+json',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const error = new Error(`GitHub zipball download failed (${response.status}): ${body || response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}
