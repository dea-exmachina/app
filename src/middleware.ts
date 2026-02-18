import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/server/auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/webhooks', '/research/reports']

export function middleware(request: NextRequest) {
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

  if (!authSecret || !sessionToken || !verifySessionToken(sessionToken, authSecret)) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
