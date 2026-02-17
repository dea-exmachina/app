import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

export interface ReopenStats {
  totalReopens: number
  uniqueCards: number
  reopenRate: number
  recentReopens: Array<{
    id: string
    cardId: string
    reopenedFrom: string
    reopenedTo: string
    reason: string | null
    createdAt: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    // Get reopen records
    const { data: reopens, error: reopenErr } = await tables.nexus_card_reopens
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (reopenErr) throw reopenErr

    // Get total done cards for rate calculation
    const { count: doneCount, error: doneErr } = await tables.nexus_cards
      .select('*', { count: 'exact', head: true })
      .eq('lane', 'done')

    if (doneErr) throw doneErr

    const totalReopens = (reopens ?? []).length
    const uniqueCards = new Set((reopens ?? []).map((r: Record<string, unknown>) => r.card_id)).size
    const totalDone = doneCount ?? 0
    const reopenRate = totalDone > 0 ? (uniqueCards / totalDone) * 100 : 0

    const recentReopens = (reopens ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      cardId: r.card_id as string,
      reopenedFrom: r.reopened_from as string,
      reopenedTo: r.reopened_to as string,
      reason: r.reason as string | null,
      createdAt: r.created_at as string,
    }))

    const stats: ReopenStats = {
      totalReopens,
      uniqueCards,
      reopenRate: Math.round(reopenRate * 10) / 10,
      recentReopens,
    }

    return NextResponse.json({ data: stats, cached: false })
  } catch (err) {
    console.error('Reopen stats error:', err)
    return NextResponse.json(
      { error: { message: 'Failed to fetch reopen stats' } },
      { status: 500 }
    )
  }
}
