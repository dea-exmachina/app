import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  const validUsername = process.env.ADMIN_USERNAME
  const validPassword = process.env.ADMIN_PASSWORD
  const authSecret = process.env.AUTH_SECRET

  if (!validUsername || !validPassword || !authSecret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 })
  }

  if (username === validUsername && password === validPassword) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('dea-auth', authSecret, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
