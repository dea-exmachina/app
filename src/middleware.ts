import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/api/webhooks', '/api/debug', '/api/ping']

export function middleware(request: NextRequest) {
  // Skip auth in development
  if (process.env.NODE_ENV === 'development') {
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

  // Check auth cookie
  const authToken = request.cookies.get('dea-auth')?.value
  const expectedToken = process.env.AUTH_SECRET

  if (!expectedToken || authToken !== expectedToken) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
