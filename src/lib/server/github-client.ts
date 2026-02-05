import { Octokit } from 'octokit'
import type { DataSource, FileResult, DataSourceStatus } from '@/types/data-source'

/**
 * GitHubDataSource — v1 implementation
 * Reads dea-exmachina repo content via GitHub REST API with ETag caching.
 */
export class GitHubDataSource implements DataSource {
  private octokit: Octokit
  private owner: string
  private repo: string
  private etagCache: Map<string, { etag: string; data: FileResult }> =
    new Map()

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
      const cached = this.etagCache.get(path)
      const headers: Record<string, string> = {}
      if (cached) {
        headers['If-None-Match'] = cached.etag
      }

      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        headers,
      })

      // Handle 304 Not Modified (Octokit returns 304 as a thrown error,
      // but with If-None-Match it may also return the cached data)
      const status = response.status as number
      if (status === 304 && cached) {
        return cached.data
      }

      const data = response.data
      if (Array.isArray(data) || data.type !== 'file') {
        return null
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      const result: FileResult = {
        path: data.path,
        content,
        sha: data.sha,
        lastModified: null,
      }

      // Cache with ETag
      const etag = response.headers.etag
      if (etag) {
        this.etagCache.set(path, { etag, data: result })
      }

      return result
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
}

// Singleton instance for the server
let instance: GitHubDataSource | null = null

export function getDataSource(): DataSource {
  if (!instance) {
    instance = new GitHubDataSource()
  }
  return instance
}
