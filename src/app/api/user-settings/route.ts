/**
 * User Settings API Route
 *
 * GET /api/user-settings - List all user settings
 * PUT /api/user-settings - Upsert a setting by key
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export async function GET() {
  try {
    const { data, error } = await tables.user_settings
      .select('*')
      .order('category')
      .order('key')

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const settings = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      category: row.category,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ data: settings, cached: false })
  } catch (err) {
    console.error('User settings GET error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, category, description } = body

    if (!key) {
      return NextResponse.json({ error: { message: 'key is required' } }, { status: 400 })
    }

    const upsertData: Record<string, unknown> = {
      key,
      value: JSON.parse(JSON.stringify(value)),
      updated_at: new Date().toISOString(),
    }
    if (category !== undefined) upsertData.category = category
    if (description !== undefined) upsertData.description = description

    const { data, error } = await tables.user_settings
      .upsert(upsertData, { onConflict: 'key' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: { message: error.message } }, { status: 500 })
    }

    const setting = {
      id: data.id,
      key: data.key,
      value: data.value,
      category: data.category,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ data: setting, cached: false })
  } catch (err) {
    console.error('User settings PUT error:', err)
    return NextResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })
  }
}
