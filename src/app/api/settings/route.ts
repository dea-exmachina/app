import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/database'

/**
 * GET /api/settings?key=auto_flag_on_review
 * Returns a single setting from routing_config by key
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')

  if (!key) {
    return NextResponse.json(
      { error: 'key parameter is required' },
      { status: 400 }
    )
  }

  const { data, error } = await db
    .from('routing_config')
    .select('*')
    .eq('key', key)
    .single()

  if (error) {
    // Not found — return default
    if (error.code === 'PGRST116') {
      return NextResponse.json({ key, value: null })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/settings
 * Upsert a setting in routing_config
 * Body: { key: string, value: any, description?: string }
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { key, value, description } = body

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: 'key and value are required' },
      { status: 400 }
    )
  }

  const { data, error } = await db
    .from('routing_config')
    .upsert(
      {
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
