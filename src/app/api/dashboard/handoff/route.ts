import { NextResponse } from 'next/server'
import type { ApiResponse, ApiError } from '@/types/api'
import type { HandoffSection } from '@/types/kanban'

/**
 * GET /api/dashboard/handoff — Handoff section
 *
 * Previously from kanban_boards management board JSONB.
 * Now returns 404 — handoff data lives in vault markdown (kanban/management.md),
 * not in NEXUS Supabase. Will be replaced by NEXUS session handoff when available.
 */

export async function GET(): Promise<
  NextResponse<ApiResponse<HandoffSection> | ApiError>
> {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Handoff section not available — migrated to NEXUS',
      },
    },
    { status: 404 }
  )
}
