import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderPlatform } from '@/types/bender'

export async function GET(): Promise<
  NextResponse<ApiResponse<BenderPlatform[]> | ApiError>
> {
  try {
    const { data, error } = await tables.bender_platforms
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    // Map database columns to BenderPlatform interface
    // Handle nullable columns with fallbacks
    const platforms: BenderPlatform[] = (data ?? []).map((row) => ({
      name: row.name,
      slug: row.slug,
      status: (row.status as BenderPlatform['status']) ?? 'active',
      interface: row.interface ?? '',
      models: (row.models as string[]) ?? [],
      costTier: (row.cost_tier as BenderPlatform['costTier']) ?? 'TBD',
      strengths: (row.strengths as string[]) ?? [],
      limitations: (row.limitations as string[]) ?? [],
      configLocation: row.config_location ?? '',
      contextDirectory: row.context_directory ?? '',
    }))

    return NextResponse.json({ data: platforms, cached: false })
  } catch (error) {
    console.error('Error fetching platforms:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch bender platforms',
        },
      },
      { status: 500 }
    )
  }
}
