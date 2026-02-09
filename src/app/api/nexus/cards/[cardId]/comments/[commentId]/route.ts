/**
 * NEXUS Comment Actions API — resolve, edit, delete individual comments
 *
 * PATCH  /api/nexus/cards/[cardId]/comments/[commentId]
 *   Body: { resolved: true } OR { content: "updated text", comment_type?: "..." }
 * DELETE /api/nexus/cards/[cardId]/comments/[commentId]
 *   Only user-authored comments can be edited/deleted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

async function resolveCardUuid(cardId: string): Promise<string | null> {
  const { data } = await tables.nexus_cards
    .select('id')
    .eq('card_id', cardId)
    .single()
  return data?.id ?? null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string; commentId: string }> }
) {
  try {
    const { cardId, commentId } = await params
    const uuid = await resolveCardUuid(cardId)

    if (!uuid) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Resolve action
    if (body.resolved === true) {
      const { data, error } = await tables.nexus_comments
        .update({
          resolved: true,
          resolved_by: 'user',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('card_id', uuid)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: { code: 'UPDATE_ERROR', message: error.message } },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
          { status: 404 }
        )
      }

      return NextResponse.json({ data, cached: false })
    }

    // Edit action — only user-authored comments
    if (body.content !== undefined) {
      // Verify the comment belongs to 'user'
      const { data: existing } = await tables.nexus_comments
        .select('author')
        .eq('id', commentId)
        .eq('card_id', uuid)
        .single()

      if (!existing) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
          { status: 404 }
        )
      }

      if (existing.author !== 'user') {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Can only edit your own comments' } },
          { status: 403 }
        )
      }

      const updateFields: Record<string, unknown> = { content: body.content }
      if (body.comment_type) updateFields.comment_type = body.comment_type

      const { data, error } = await tables.nexus_comments
        .update(updateFields)
        .eq('id', commentId)
        .eq('card_id', uuid)
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { error: { code: 'UPDATE_ERROR', message: error.message } },
          { status: 500 }
        )
      }

      return NextResponse.json({ data, cached: false })
    }

    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Provide { resolved: true } or { content: "..." }' } },
      { status: 400 }
    )
  } catch (error) {
    console.error('PATCH /api/nexus/cards/[cardId]/comments/[commentId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update comment' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string; commentId: string }> }
) {
  try {
    const { cardId, commentId } = await params
    const uuid = await resolveCardUuid(cardId)

    if (!uuid) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    // Verify the comment belongs to 'user'
    const { data: existing } = await tables.nexus_comments
      .select('author')
      .eq('id', commentId)
      .eq('card_id', uuid)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Comment not found: ${commentId}` } },
        { status: 404 }
      )
    }

    if (existing.author !== 'user') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Can only delete your own comments' } },
        { status: 403 }
      )
    }

    const { error } = await tables.nexus_comments
      .delete()
      .eq('id', commentId)
      .eq('card_id', uuid)

    if (error) {
      return NextResponse.json(
        { error: { code: 'DELETE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('DELETE /api/nexus/cards/[cardId]/comments/[commentId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete comment' } },
      { status: 500 }
    )
  }
}
