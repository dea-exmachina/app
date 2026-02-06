import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderTeam, BenderAgent } from '@/types/bender'

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderTeam[]> | ApiError>
> {
  try {
    const { data, error } = await tables.bender_teams
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    // Map database columns to BenderTeam interface
    // Note: members and file_ownership added via migration 008
    const teams: BenderTeam[] = (data ?? []).map((row) => ({
      name: row.name,
      members: ((row as Record<string, unknown>).members as BenderAgent[]) ?? [],
      sequencing: row.sequencing ?? '',
      fileOwnership: ((row as Record<string, unknown>).file_ownership as BenderTeam['fileOwnership']) ?? {},
      branchStrategy: row.branch_strategy ?? '',
    }))

    return NextResponse.json({ data: teams, cached: false })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender teams',
        },
      },
      { status: 500 }
    )
  }
}
