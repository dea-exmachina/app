import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Build OAuth 1.0a authorization header for X API.
 * Signs using HMAC-SHA1 per the OAuth 1.0a spec.
 */
function buildOAuthHeader(
  method: string,
  url: string,
  bodyParams: Record<string, string>
): string {
  const apiKey = process.env.X_API_KEY!
  const apiSecret = process.env.X_API_SECRET!
  const accessToken = process.env.X_ACCESS_TOKEN!
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET!

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  // Collect all params for signature base string
  const allParams: Record<string, string> = { ...oauthParams, ...bodyParams }
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join('&')

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&')

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64')

  oauthParams['oauth_signature'] = signature

  const headerValue = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ')

  return `OAuth ${headerValue}`
}

/**
 * POST /api/x/post
 * Post a tweet via X OAuth 1.0a.
 * Body: { text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text?: string }
    const text = body.text?.trim()

    if (!text) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'text is required' } },
        { status: 400 }
      )
    }

    if (text.length > 280) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'text exceeds 280 characters' } },
        { status: 400 }
      )
    }

    const url = 'https://api.twitter.com/2/tweets'
    const tweetBody = { text }

    const authHeader = buildOAuthHeader('POST', url, {})

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    })

    const data = await response.json() as {
      data?: { id: string; text: string }
      errors?: Array<{ message: string }>
    }

    if (!response.ok) {
      const message = data.errors?.[0]?.message ?? 'Failed to post tweet'
      return NextResponse.json(
        { error: { code: 'X_API_ERROR', message } },
        { status: response.status }
      )
    }

    return NextResponse.json({
      id: data.data!.id,
      text: data.data!.text,
    })
  } catch (error) {
    console.error('POST /api/x/post error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to post tweet' } },
      { status: 500 }
    )
  }
}
