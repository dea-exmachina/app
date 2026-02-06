import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { BenderPlatform } from '@/types/bender'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<BenderPlatform> | ApiError>> {
  try {
    const { slug } = await params

    const { data: row, error } = await tables.bender_platforms
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !row) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: `Platform '${slug}' not found`,
          },
        },
        { status: 404 }
      )
    }

    // Map database columns to BenderPlatform interface
    // Handle nullable columns with fallbacks
    const platform: BenderPlatform = {
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
    }

    return NextResponse.json({ data: platform, cached: false })
  } catch (error) {
    console.error('Error fetching platform:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch platform',
        },
      },
      { status: 500 }
    )
  }
}
