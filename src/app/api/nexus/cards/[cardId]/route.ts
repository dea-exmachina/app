/**
 * NEXUS Card Detail API — Get and Update
 *
 * GET   /api/nexus/cards/[cardId]  — get card by card_id (e.g. DEA-042)
 * PATCH /api/nexus/cards/[cardId]  — update card fields (lane, assigned_to, etc.)
 *
 * Re-open logic (CC-121): when lane='in_progress' and reopen_type is present,
 * increments reopen_count, writes a nexus_comment, and flags bender regression
 * if reopen_type='bug_fix'.
 *
 * DEA-042 | Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, tables } from '@/lib/server/database'
import type { NexusCardUpdate } from '@/types/nexus'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params

    const { data, error } = await tables.nexus_cards
      .select('*')
      .eq('card_id', cardId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/cards/[cardId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get card' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody: NexusCardUpdate & Record<string, any> = await request.json()

    if (Object.keys(rawBody).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No fields to update' } },
        { status: 400 }
      )
    }

    // Extract re-open fields before passing body to RPC (these are not card columns)
    const reopenType = rawBody.reopen_type as 'bug_fix' | 'scope_change' | undefined
    const reopenNote = rawBody.reopen_note as string | undefined

    // Build the RPC update payload — strip re-open fields that don't belong on nexus_cards
    const { reopen_type: _rt, reopen_note: _rn, ...body } = rawBody as Record<string, unknown>
    void _rt; void _rn

    // Use RPC to set app.actor so triggers record who made the change
    const actor = 'webapp'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any).rpc('update_card_with_actor', {
      p_card_id: cardId,
      p_actor: actor,
      p_updates: body,
    })

    if (error) {
      if (error.message?.includes('Card not found')) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `Card not found: ${cardId}` } },
          { status: 404 }
        )
      }
      if (error.message?.includes('Invalid lane transition')) {
        return NextResponse.json(
          { error: { code: 'INVALID_TRANSITION', message: error.message } },
          { status: 422 }
        )
      }
      if (error.message?.includes('Concurrent modification detected')) {
        return NextResponse.json(
          { error: { code: 'CONFLICT', message: error.message } },
          { status: 409 }
        )
      }
      if (error.message?.includes('is locked for lane move')) {
        return NextResponse.json(
          { error: { code: 'LOCKED', message: error.message } },
          { status: 423 }
        )
      }
      return NextResponse.json(
        { error: { code: 'UPDATE_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    // Re-open logic: only when moving to in_progress with an explicit reopen_type
    if (body.lane === 'in_progress' && reopenType) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardUuid = (data as any)?.id as string | undefined

      // 1. Increment reopen_count and record type/reason on the card
      await tables.nexus_cards
        .update({
          reopen_count: ((data as any)?.reopen_count ?? 0) + 1,
          reopen_type: reopenType,
          reopen_reason: reopenNote ?? null,
        } as Record<string, unknown>)
        .eq('card_id', cardId)

      // 2. Write a nexus_comment explaining the re-open
      if (cardUuid) {
        const commentContent =
          reopenType === 'bug_fix'
            ? `Re-opened (bug fix): ${reopenNote ?? 'original implementation did not work as intended'}`
            : `Re-opened (scope change): ${reopenNote ?? 'requirements changed'}`

        await tables.nexus_comments
          .insert({
            card_id: cardUuid,
            author: 'webapp',
            content: commentContent,
          } as Record<string, unknown>)
      }

      // 3. If bug_fix: find the delivering bender and flag regression
      let benderSlug: string | undefined
      if (reopenType === 'bug_fix') {
        const { data: taskData } = await tables.bender_tasks
          .select('id, member')
          .eq('card_id', cardId)
          .in('status', ['delivered', 'integrated', 'completed'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = taskData as any
        if (task?.id) {
          await tables.bender_tasks
            .update({
              regression: true,
              regression_count: (task.regression_count ?? 0) + 1,
            } as Record<string, unknown>)
            .eq('id', task.id)

          benderSlug = task.member as string

          // Write regression flag comment
          if (cardUuid) {
            await tables.nexus_comments
              .insert({
                card_id: cardUuid,
                author: 'webapp',
                content: `Regression flagged → ${benderSlug}. Investigation task will be auto-created.`,
              } as Record<string, unknown>)
          }
        }
      }

      // 4. Return enriched response with re-open metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reopen_count = ((data as any)?.reopen_count ?? 0) + 1
      return NextResponse.json({
        data,
        cached: false,
        reopen_count,
        ...(benderSlug ? { bender_slug: benderSlug } : {}),
      })
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('PATCH /api/nexus/cards/[cardId] error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update card' } },
      { status: 500 }
    )
  }
}
