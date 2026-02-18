import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { createSessionToken } from '@/lib/server/auth'

const RATE_LIMIT_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 60_000 // 60 seconds

export async function POST(request: NextRequest) {
  // Rate limiting — keyed on forwarded IP or connection remote address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { allowed, remaining, resetAt } = checkRateLimit(ip, RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW_MS)

  if (!allowed) {
    const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(RATE_LIMIT_ATTEMPTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      },
    )
  }

  const validUsername = process.env.ADMIN_USERNAME
  const validPassword = process.env.ADMIN_PASSWORD
  const authSecret = process.env.AUTH_SECRET

  if (!validUsername || !validPassword || !authSecret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  const { username, password } = await request.json()

  // Constant-time comparison to prevent timing attacks.
  // timingSafeEqual requires equal-length buffers — length difference is itself
  // constant-time to detect (strings with wrong length always fail).
  const usernameBytes = Buffer.from(typeof username === 'string' ? username : '')
  const passwordBytes = Buffer.from(typeof password === 'string' ? password : '')
  const validUsernameBytes = Buffer.from(validUsername)
  const validPasswordBytes = Buffer.from(validPassword)

  const usernameMatch =
    usernameBytes.length === validUsernameBytes.length &&
    timingSafeEqual(usernameBytes, validUsernameBytes)
  const passwordMatch =
    passwordBytes.length === validPasswordBytes.length &&
    timingSafeEqual(passwordBytes, validPasswordBytes)

  if (usernameMatch && passwordMatch) {
    // Generate a unique per-session HMAC token — stateless across serverless instances
    const sessionToken = createSessionToken(authSecret)

    const response = NextResponse.json({ success: true })
    response.cookies.set('dea-auth', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
