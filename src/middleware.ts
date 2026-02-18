import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/webhooks', '/research/reports']

// Edge-compatible HMAC verification using Web Crypto API (crypto.subtle).
// Cannot import Node.js 'crypto' module in middleware — Edge Runtime doesn't support it.
// API routes (Node runtime) continue to use auth.ts with Node crypto.
async function verifySessionTokenEdge(token: string, secret: string): Promise<boolean> {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return false

  const sessionId = token.slice(0, dotIndex)
  const mac = token.slice(dotIndex + 1)

  if (!sessionId || !mac) return false

  try {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(sessionId))
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    // Constant-time string comparison via XOR (no Buffer.timingSafeEqual in Edge)
    if (expected.length !== mac.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  // Skip auth in development and preview
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview') {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  // Verify HMAC session token — stateless, works across serverless instances
  const sessionToken = request.cookies.get('dea-auth')?.value
  const authSecret = process.env.AUTH_SECRET

  if (!authSecret || !sessionToken || !(await verifySessionTokenEdge(sessionToken, authSecret))) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
