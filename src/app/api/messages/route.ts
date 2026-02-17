import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

/**
 * GET /api/messages
 *
 * Fetch messages for a project
 *
 * Query params:
 * - project_id (optional): Filter by project
 * - limit (optional): Number of messages to return (default: 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('project_id')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    let query = tables.messages
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/messages
 *
 * Send a new message
 *
 * Body:
 * - content (required): Message text
 * - project_id (optional): Project context
 * - in_reply_to (optional): Parent message ID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { content, project_id, in_reply_to } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required and must be a string' },
        { status: 400 }
      )
    }

    const { data, error } = await tables.messages
      .insert({
        sender: 'user',
        content: content.trim(),
        project_id: project_id || null,
        in_reply_to: in_reply_to || null,
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating message:', error)
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
