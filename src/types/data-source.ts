// Data Source adapter interface
// v1: GitHubDataSource (reads from GitHub REST API)
// v2: FilesystemDataSource (reads directly from disk)
// v3: ApiDataSource (reads from a dedicated dea API service)

export interface DataSource {
  /** Fetch a single file's content by path */
  getFile(path: string): Promise<FileResult | null>

  /** List files in a directory */
  listDirectory(path: string): Promise<string[]>

  /** Check connectivity and rate limits */
  getStatus(): Promise<DataSourceStatus>

  /** Create or update a file (optional — not all data sources support writes) */
  createFile?(
    path: string,
    content: string,
    message: string
  ): Promise<{ path: string; sha: string }>

  /** Delete a file (optional — not all data sources support writes) */
  deleteFile?(path: string, sha: string, message: string): Promise<void>
}

export interface FileResult {
  path: string
  content: string
  sha: string | null
  lastModified: string | null
}

export interface DataSourceStatus {
  connected: boolean
  source: 'github' | 'filesystem' | 'api'
  rateLimit?: {
    limit: number
    remaining: number
    reset: string
    used: number
  }
}
