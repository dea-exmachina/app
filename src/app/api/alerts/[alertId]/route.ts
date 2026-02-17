import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { Alert } from '@/types/alert'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params
    const body = await request.json()

    const update: Record<string, unknown> = {}
    if (body.status === 'acknowledged') {
      update.status = 'acknowledged'
      update.acknowledged_at = new Date().toISOString()
    } else if (body.status === 'resolved') {
      update.status = 'resolved'
      update.resolved_at = new Date().toISOString()
    } else if (body.status) {
      update.status = body.status
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: { message: 'No valid fields to update' } },
        { status: 400 }
      )
    }

    const { data, error } = await tables.nexus_alerts
      .update(update)
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data: mapRow(data), cached: false })
  } catch (err) {
    console.error('Alert PATCH error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to update alert' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params

    const { error } = await tables.nexus_alerts
      .delete()
      .eq('id', alertId)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('Alert DELETE error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to delete alert' } },
      { status: 500 }
    )
  }
}
