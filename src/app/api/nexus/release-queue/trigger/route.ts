/**
 * Release Pipeline Trigger API
 *
 * POST /api/nexus/release-queue/trigger  — dispatch automated release for CC-* cards
 * GET  /api/nexus/release-queue/trigger  — poll release run status
 *
 * CC-062 | Automated Release Pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/database'

// ── POST: Trigger release ───────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cardIds: unknown = body.card_ids

    // Validate input
    if (!Array.isArray(cardIds) || cardIds.length === 0 || !cardIds.every((id) => typeof id === 'string')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'card_ids must be a non-empty string array' } },
        { status: 400 }
      )
    }

    // Filter to CC-* cards only
    const ccCards = (cardIds as string[]).filter((id) => id.startsWith('CC-'))
    const skippedCards = (cardIds as string[]).filter((id) => !id.startsWith('CC-'))

    if (ccCards.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No CC-* cards in the list. Only CC cards can be auto-released.' } },
        { status: 400 }
      )
    }

    // Validate each card: must be in review lane + ready_for_production
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cards, error: cardsError } = await (db as any)
      .from('nexus_cards')
      .select('card_id, lane, ready_for_production')
      .in('card_id', ccCards)

    if (cardsError) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: cardsError.message } },
        { status: 500 }
      )
    }

    const invalidCards: string[] = []
    const validCardIds: string[] = []

    for (const id of ccCards) {
      const card = cards?.find((c: { card_id: string }) => c.card_id === id)
      if (!card) {
        invalidCards.push(`${id}: not found`)
      } else if (card.lane !== 'review') {
        invalidCards.push(`${id}: not in review lane (current: ${card.lane})`)
      } else if (!card.ready_for_production) {
        invalidCards.push(`${id}: not flagged for production`)
      } else {
        validCardIds.push(id)
      }
    }

    if (validCardIds.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `No valid cards to release. Issues: ${invalidCards.join('; ')}` } },
        { status: 422 }
      )
    }

    // Idempotency: check for active release runs with overlapping cards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: activeRuns } = await (db as any)
      .from('release_runs')
      .select('id, card_ids, status')
      .in('status', ['pending', 'dispatched', 'in_progress'])

    if (activeRuns && activeRuns.length > 0) {
      for (const run of activeRuns) {
        const overlap = validCardIds.filter((id: string) => run.card_ids?.includes(id))
        if (overlap.length > 0) {
          return NextResponse.json(
            {
              error: {
                code: 'CONFLICT',
                message: `Active release run ${run.id} already includes: ${overlap.join(', ')}`,
              },
            },
            { status: 409 }
          )
        }
      }
    }

    // Create release_runs record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: releaseRun, error: insertError } = await (db as any)
      .from('release_runs')
      .insert({
        card_ids: validCardIds,
        status: 'pending',
        triggered_by: 'webapp',
      })
      .select('id')
      .single()

    if (insertError || !releaseRun) {
      return NextResponse.json(
        { error: { code: 'INSERT_ERROR', message: insertError?.message || 'Failed to create release run' } },
        { status: 500 }
      )
    }

    // Dispatch GitHub Actions workflow
    const pat = process.env.GITHUB_RELEASE_PAT
    if (!pat) {
      // Clean up the pending record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('release_runs').update({ status: 'failed', summary: 'Missing GITHUB_RELEASE_PAT' }).eq('id', releaseRun.id)
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'Release pipeline not configured: missing GITHUB_RELEASE_PAT' } },
        { status: 500 }
      )
    }

    const dispatchResponse = await fetch(
      'https://api.github.com/repos/george-a-ata/control-center/actions/workflows/release.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'master',
          inputs: {
            card_ids: JSON.stringify(validCardIds),
            run_id: releaseRun.id,
          },
        }),
      }
    )

    if (!dispatchResponse.ok) {
      const errorBody = await dispatchResponse.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('release_runs').update({ status: 'failed', summary: `GitHub dispatch failed: ${dispatchResponse.status}` }).eq('id', releaseRun.id)
      return NextResponse.json(
        { error: { code: 'DISPATCH_ERROR', message: `GitHub Actions dispatch failed (${dispatchResponse.status}): ${errorBody}` } },
        { status: 502 }
      )
    }

    // Update status to dispatched
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('release_runs').update({ status: 'dispatched' }).eq('id', releaseRun.id)

    return NextResponse.json({
      data: {
        run_id: releaseRun.id,
        dispatched_cards: validCardIds,
        skipped_cards: skippedCards,
        invalid_cards: invalidCards,
      },
      cached: false,
    })
  } catch (error) {
    console.error('POST /api/nexus/release-queue/trigger error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger release' } },
      { status: 500 }
    )
  }
}

// ── GET: Poll release run status ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('run_id')

    if (!runId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'run_id query parameter is required' } },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any)
      .from('release_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Release run not found: ${runId}` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data, cached: false })
  } catch (error) {
    console.error('GET /api/nexus/release-queue/trigger error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get release run status' } },
      { status: 500 }
    )
  }
}
