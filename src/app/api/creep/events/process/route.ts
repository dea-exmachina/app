import { NextRequest, NextResponse } from 'next/server'
import { processEvents } from '@/lib/creep/consumer'

/**
 * POST /api/creep/events/process
 *
 * Trigger event processing: routes unprocessed events to registered consumers.
 *
 * Body (optional):
 *   { "limit": 50 }  — max events to process in this batch (default 50, max 200)
 *
 * Use cases:
 * - Manual trigger from Control Center dashboard
 * - Future: Vercel cron job (vercel.json crons config)
 * - Future: Supabase Edge Function on schedule
 *
 * TASK-008 | Phase 1 Core Infrastructure
 */
export async function POST(request: NextRequest) {
  try {
    // Parse optional limit from body
    let limit = 50
    try {
      const body = await request.json()
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(Math.max(body.limit, 1), 200)
      }
    } catch {
      // Empty body is fine — use default limit
    }

    const result = await processEvents(limit)

    return NextResponse.json({
      data: {
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
        total: result.processed + result.failed + result.skipped,
        details: result.details,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Error processing creep events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}
