import { Octokit } from 'octokit'
import type { DataSource, FileResult, DataSourceStatus } from '@/types/data-source'

/**
 * GitHubDataSource — v1 implementation
 * Reads dea-exmachina repo content via GitHub REST API.
 * Caching handled by withCache() in API routes — no ETag layer needed for v1.
 */
export class GitHubDataSource implements DataSource {
  private octokit: Octokit
  private owner: string
  private repo: string

  constructor() {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required')
    }

    this.owner = process.env.GITHUB_OWNER ?? 'george-a-ata'
    this.repo = process.env.GITHUB_REPO ?? 'dea-exmachina'
    this.octokit = new Octokit({ auth: token })
  }

  async getFile(path: string): Promise<FileResult | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      })

      const data = response.data
      if (Array.isArray(data) || data.type !== 'file') {
        return null
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return {
        path: data.path,
        content,
        sha: data.sha,
        lastModified: null,
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404
      ) {
        return null
      }
      throw error
    }
  }

  async listDirectory(path: string): Promise<string[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      })

      if (!Array.isArray(response.data)) {
        return []
      }

      return response.data.map((item) => item.path)
    } catch {
      return []
    }
  }

  async getStatus(): Promise<DataSourceStatus> {
    try {
      const rateLimit = await this.octokit.rest.rateLimit.get()
      const { limit, remaining, reset, used } = rateLimit.data.rate

      return {
        connected: true,
        source: 'github',
        rateLimit: {
          limit,
          remaining,
          reset: new Date(reset * 1000).toISOString(),
          used,
        },
      }
    } catch {
      return { connected: false, source: 'github' }
    }
  }

  async createFile(
    path: string,
    content: string,
    message: string
  ): Promise<{ path: string; sha: string }> {
    const response = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
    })

    return {
      path: response.data.content?.path ?? path,
      sha: response.data.content?.sha ?? '',
    }
  }

  async deleteFile(
    path: string,
    sha: string,
    message: string
  ): Promise<void> {
    await this.octokit.rest.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      sha,
    })
  }

  /** Expose Octokit for direct API calls (e.g., listCommits) */
  getOctokit(): { octokit: Octokit; owner: string; repo: string } {
    return { octokit: this.octokit, owner: this.owner, repo: this.repo }
  }
}

// Singleton instance for the server
let instance: GitHubDataSource | null = null

export function getDataSource(): GitHubDataSource {
  if (!instance) {
    instance = new GitHubDataSource()
  }
  return instance
}
