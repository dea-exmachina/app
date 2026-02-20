import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/server/database'

/**
 * GET /api/kanban/sprints — List all sprints
 * POST /api/kanban/sprints — Create a new sprint
 */

export async function GET() {
  try {
    const db = getDb()
    const { data, error } = await db
      .from('nexus_sprints')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data, cached: false })
  } catch (err) {
    console.error('GET /api/kanban/sprints error:', err)
    return NextResponse.json({ error: { code: 'FETCH_ERROR', message: 'Failed to fetch sprints' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()
    const { name, goal, start_date, end_date, status = 'planning' } = body as {
      name: string
      goal?: string
      start_date: string
      end_date: string
      status?: string
    }

    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'name, start_date, and end_date are required' } }, { status: 400 })
    }

    const { data, error } = await db
      .from('nexus_sprints')
      .insert({ name, goal, start_date, end_date, status })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (err) {
    console.error('POST /api/kanban/sprints error:', err)
    return NextResponse.json({ error: { code: 'CREATE_ERROR', message: 'Failed to create sprint' } }, { status: 500 })
  }
}
