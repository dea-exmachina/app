/**
 * Scheduled Release Cron API
 *
 * POST /api/nexus/release-queue/cron — checks for due scheduled releases and dispatches them
 *
 * CC-063 | Scheduled Releases
 *
 * Intended to be called by Vercel Cron or external scheduler every 5 minutes.
 * Protected by CRON_SECRET header check.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/database'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
        { status: 401 }
      )
    }

    // Find scheduled releases that are due
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dueRuns, error: queryError } = await (db as any)
      .from('release_runs')
      .select('id, card_ids, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })

    if (queryError) {
      return NextResponse.json(
        { error: { code: 'QUERY_ERROR', message: queryError.message } },
        { status: 500 }
      )
    }

    if (!dueRuns || dueRuns.length === 0) {
      return NextResponse.json({ data: { dispatched: 0, runs: [] }, cached: false })
    }

    const pat = process.env.GITHUB_RELEASE_PAT
    if (!pat) {
      // Mark all as failed
      for (const run of dueRuns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from('release_runs').update({ status: 'failed', summary: 'Missing GITHUB_RELEASE_PAT' }).eq('id', run.id)
      }
      return NextResponse.json(
        { error: { code: 'CONFIG_ERROR', message: 'Release pipeline not configured: missing GITHUB_RELEASE_PAT' } },
        { status: 500 }
      )
    }

    const results: { runId: string; status: string; cardCount: number }[] = []

    for (const run of dueRuns) {
      try {
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
                card_ids: JSON.stringify(run.card_ids),
                run_id: run.id,
              },
            }),
          }
        )

        if (!dispatchResponse.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('release_runs').update({ status: 'failed', summary: `GitHub dispatch failed: ${dispatchResponse.status}` }).eq('id', run.id)
          results.push({ runId: run.id, status: 'failed', cardCount: run.card_ids.length })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any).from('release_runs').update({ status: 'dispatched' }).eq('id', run.id)
          results.push({ runId: run.id, status: 'dispatched', cardCount: run.card_ids.length })
        }
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from('release_runs').update({ status: 'failed', summary: err instanceof Error ? err.message : 'Unknown error' }).eq('id', run.id)
        results.push({ runId: run.id, status: 'failed', cardCount: run.card_ids.length })
      }
    }

    return NextResponse.json({
      data: {
        dispatched: results.filter((r) => r.status === 'dispatched').length,
        failed: results.filter((r) => r.status === 'failed').length,
        runs: results,
      },
      cached: false,
    })
  } catch (error) {
    console.error('POST /api/nexus/release-queue/cron error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Cron dispatch failed' } },
      { status: 500 }
    )
  }
}
