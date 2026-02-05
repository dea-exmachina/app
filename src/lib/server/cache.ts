import { LRUCache } from 'lru-cache'

interface CachedItem<T> {
  data: T
  timestamp: number
}

const cache = new LRUCache<string, CachedItem<unknown>>({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 min default
})

/**
 * Cache wrapper with per-key TTL support.
 * Used by API routes to avoid re-parsing markdown on every request.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const existing = cache.get(key) as CachedItem<T> | undefined

  if (existing) {
    const age = Date.now() - existing.timestamp
    if (age < ttlMs) {
      return { data: existing.data, cached: true }
    }
  }

  const data = await fetcher()

  cache.set(key, { data, timestamp: Date.now() }, { ttl: ttlMs })

  return { data, cached: false }
}

/** Clear a specific cache key */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/** Clear all cached data */
export function clearCache(): void {
  cache.clear()
}
