// Interface contracts for the API layer

export interface ApiResponse<T> {
  data: T
  cached: boolean
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface RateLimit {
  limit: number
  remaining: number
  reset: string // ISO 8601
  used: number
}

export interface GitHubFile {
  path: string
  sha: string
  content: string
  encoding: string
}

export interface CacheEntry<T> {
  data: T
  etag: string | null
  timestamp: number
  ttl: number
}
