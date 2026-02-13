import { Octokit } from 'octokit';

export function createGitHubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(`Rate limited. Retrying after ${retryAfter} seconds`);
      },
      onAbuseLimit: (retryAfter: number, options: any) => {
        console.warn(`Abuse detected. Retrying after ${retryAfter} seconds`);
      },
    },
  });
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  default_branch: string;
  html_url: string;
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
  };
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
      owner: {
        login: response.data.owner.login,
      },
      default_branch: response.data.default_branch,
      html_url: response.data.html_url,
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
