import { NextResponse } from 'next/server'

interface XTweet {
  id: string
  text: string
  created_at: string
}

/**
 * GET /api/x/feed
 * Fetch the last 5 tweets for the authenticated user.
 * Uses X API v2 with bearer token (read-only).
 */
export async function GET() {
  try {
    const bearerToken = process.env.X_BEARER_TOKEN

    if (!bearerToken) {
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'X_BEARER_TOKEN not configured' } },
        { status: 500 }
      )
    }

    // Step 1: Get authenticated user's ID
    const meResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const meData = await meResponse.json() as {
      data?: { id: string; username: string }
      errors?: Array<{ message: string }>
    }

    if (!meResponse.ok) {
      const message = meData.errors?.[0]?.message ?? 'Failed to fetch user info'
      return NextResponse.json(
        { error: { code: 'X_API_ERROR', message } },
        { status: meResponse.status }
      )
    }

    const userId = meData.data!.id

    // Step 2: Fetch last 5 tweets
    const tweetsUrl = new URL(`https://api.twitter.com/2/users/${userId}/tweets`)
    tweetsUrl.searchParams.set('max_results', '5')
    tweetsUrl.searchParams.set('tweet.fields', 'created_at,text')
    tweetsUrl.searchParams.set('exclude', 'retweets,replies')

    const tweetsResponse = await fetch(tweetsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const tweetsData = await tweetsResponse.json() as {
      data?: XTweet[]
      errors?: Array<{ message: string }>
    }

    if (!tweetsResponse.ok) {
      const message = tweetsData.errors?.[0]?.message ?? 'Failed to fetch tweets'
      return NextResponse.json(
        { error: { code: 'X_API_ERROR', message } },
        { status: tweetsResponse.status }
      )
    }

    const tweets: XTweet[] = (tweetsData.data ?? []).map((t) => ({
      id: t.id,
      text: t.text,
      created_at: t.created_at,
    }))

    return NextResponse.json({ tweets })
  } catch (error) {
    console.error('GET /api/x/feed error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tweets' } },
      { status: 500 }
    )
  }
}
