// Stateless HMAC-based session verification.
//
// Why HMAC instead of storing session tokens?
// Vercel serverless functions don't share memory between middleware and API routes,
// and may run on different instances. In-memory session stores are not viable.
//
// Approach:
//   On login:     sessionId = randomUUID()
//                 mac       = HMAC-SHA256(sessionId, AUTH_SECRET)
//                 cookie    = `${sessionId}.${mac}` (hex)
//
//   On verify:    split cookie into [sessionId, mac]
//                 recompute expected = HMAC-SHA256(sessionId, AUTH_SECRET)
//                 compare expected === mac using timingSafeEqual

import { createHmac, timingSafeEqual, randomUUID } from 'crypto'

const ALGORITHM = 'sha256'

export function createSessionToken(secret: string): string {
  const sessionId = randomUUID()
  const mac = createHmac(ALGORITHM, secret).update(sessionId).digest('hex')
  return `${sessionId}.${mac}`
}

export function verifySessionToken(token: string, secret: string): boolean {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return false

  const sessionId = token.slice(0, dotIndex)
  const mac = token.slice(dotIndex + 1)

  if (!sessionId || !mac) return false

  const expected = createHmac(ALGORITHM, secret).update(sessionId).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    // Buffer lengths differ (malformed hex) — not equal
    return false
  }
}
