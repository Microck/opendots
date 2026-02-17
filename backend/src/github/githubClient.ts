import { Octokit } from 'octokit';

export function createGitHubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(`GitHub rate limit hit for ${options.method} ${options.url}. Retry after ${retryAfter}s`);
        return true;
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(`GitHub secondary rate limit hit for ${options.method} ${options.url}. Retry after ${retryAfter}s`);
        return true;
      },
    },
  });
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  default_branch: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  license: {
    spdx_id: string;
  } | null;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
  };
}

export interface GitHubAuthenticatedUser {
  id: number;
  login: string;
}

export async function getRepoInfo(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GitHubRepoInfo | null> {
  try {
    const response = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      id: response.data.id,
      name: response.data.name,
      full_name: response.data.full_name,
      private: response.data.private,
      owner: {
        login: response.data.owner.login,
      },
      default_branch: response.data.default_branch,
      html_url: response.data.html_url,
      description: response.data.description ?? null,
      stargazers_count: response.data.stargazers_count ?? 0,
      forks_count: response.data.forks_count ?? 0,
      license: response.data.license ? { spdx_id: response.data.license.spdx_id ?? 'NOASSERTION' } : null,
      permissions: {
        admin: response.data.permissions?.admin || false,
        maintain: response.data.permissions?.maintain || false,
        push: response.data.permissions?.push || false,
      },
    };
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (!('content' in response.data)) {
      return null;
    }

    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getAuthenticatedUser(
  octokit: Octokit
): Promise<GitHubAuthenticatedUser> {
  const response = await octokit.rest.users.getAuthenticated();

  return {
    id: response.data.id,
    login: response.data.login,
  };
}
