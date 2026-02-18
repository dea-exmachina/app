// In-memory rate limiter — per-IP, per-serverless-instance.
// Vercel serverless functions don't share memory between instances,
// so this provides best-effort protection rather than strict enforcement.
// Acceptable for a single-admin dashboard with no high-value targets.

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60 seconds to prevent unbounded growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 60_000)

export function checkRateLimit(
  ip: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || entry.resetAt < now) {
    // First attempt in this window (or window expired)
    const resetAt = now + windowMs
    store.set(ip, { count: 1, resetAt })
    return { allowed: true, remaining: maxAttempts - 1, resetAt }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt }
}
