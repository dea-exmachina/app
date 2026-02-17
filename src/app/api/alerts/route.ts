import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { Alert, AlertCreateRequest } from '@/types/alert'

function mapRow(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    source: row.source as Alert['source'],
    severity: row.severity as Alert['severity'],
    title: row.title as string,
    message: row.message as string | null,
    status: row.status as Alert['status'],
    cardId: row.card_id as string | null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    acknowledgedAt: row.acknowledged_at as string | null,
    resolvedAt: row.resolved_at as string | null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    let query = tables.nexus_alerts
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)

    const { data, error } = await query

    if (error) throw error

    const alerts = (data ?? []).map((row: Record<string, unknown>) => mapRow(row))

    return NextResponse.json({ data: alerts, cached: false })
  } catch (err) {
    console.error('Alerts GET error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to fetch alerts' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AlertCreateRequest = await request.json()

    if (!body.title || !body.source) {
      return NextResponse.json(
        { error: { message: 'title and source are required' } },
        { status: 400 }
      )
    }

    const insert: Record<string, unknown> = {
      source: body.source,
      severity: body.severity ?? 'info',
      title: body.title,
      message: body.message ?? null,
      card_id: body.cardId ?? null,
      metadata: body.metadata ?? {},
    }

    const { data, error } = await tables.nexus_alerts
      .insert(insert)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: mapRow(data), cached: false }, { status: 201 })
  } catch (err) {
    console.error('Alerts POST error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to create alert' } },
      { status: 500 }
    )
  }
}
