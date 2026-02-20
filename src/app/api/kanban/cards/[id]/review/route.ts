import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiError } from '@/types/api'

/**
 * PATCH /api/kanban/cards/[id]/review
 *
 * Sets reviewed = true on a nexus_card, enabling production promotion.
 * The card ID is the human-readable card_id (e.g., "CC-105"), not the UUID.
 *
 * This is the production gate flag. Once set, the hookify reviewed-gate rule
 * allows git merge card/* and git push origin master for this card.
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ reviewed: boolean } | ApiError>> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: { code: 'MISSING_ID', message: 'Card ID is required' } },
        { status: 400 }
      )
    }

    const { data, error } = await tables.nexus_cards
      .update({ reviewed: true })
      .eq('card_id', id)
      .select('card_id, reviewed')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Card ${id} not found` } },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ reviewed: (data as { reviewed: boolean }).reviewed })
  } catch (error) {
    console.error('Error setting reviewed flag:', error)
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Failed to mark card as reviewed' } },
      { status: 500 }
    )
  }
}
