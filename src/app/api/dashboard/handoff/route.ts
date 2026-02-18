import { NextResponse } from 'next/server'
import { fetchVaultFile } from '@/lib/server/github'
import { parseHandoffSection } from '@/lib/server/handoff-parser'
import type { ApiResponse, ApiError } from '@/types/api'
import type { HandoffSection } from '@/types/kanban'

/**
 * GET /api/dashboard/handoff — Session handoff data
 *
 * Fetches inbox/last-session.md from the vault repo via GitHub API
 * and parses the ## Handoff section into structured data.
 */

export async function GET(): Promise<
  NextResponse<ApiResponse<HandoffSection> | ApiError>
> {
  try {
    const markdown = await fetchVaultFile('inbox/last-session.md')

    if (!markdown) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Could not fetch last-session.md from vault' } },
        { status: 404 }
      )
    }

    const handoff = parseHandoffSection(markdown)

    if (!handoff) {
      return NextResponse.json(
        { error: { code: 'PARSE_ERROR', message: 'No Handoff section found in last-session.md' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: handoff, cached: false })
  } catch (error) {
    console.error('Error fetching handoff:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch handoff data' } },
      { status: 500 }
    )
  }
}
