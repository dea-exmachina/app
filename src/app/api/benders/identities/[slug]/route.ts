import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'

interface BenderIdentityResponse {
  slug: string
  displayName: string
  benderName: string | null
  expertise: string[]
  platforms: string[]
  retiredAt: string | null
  performance: PerformanceEntry[]
  taskStats: {
    total: number
    avgScore: number
    latestEwma: number | null
  }
}

interface PerformanceEntry {
  taskId: string
  score: number
  ewmaSnapshot: number
  level: string
  reviewedAt: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<ApiResponse<BenderIdentityResponse> | ApiError>> {
  try {
    const { slug } = await params

    // Fetch identity (using db directly — bender_slug not in generated types)
    const { data: identity, error: idError } = await (db as any)
      .from('bender_identities')
      .select('bender_slug, display_name, bender_name, expertise, platforms, retired_at')
      .eq('bender_slug', slug)
      .single()

    if (idError || !identity) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `Bender '${slug}' not found` } },
        { status: 404 }
      )
    }

    // Fetch performance history
    const { data: perfRows } = await (db as any)
      .from('bender_performance')
      .select('task_id, score, ewma_snapshot, level, reviewed_at')
      .eq('bender_slug', slug)
      .order('reviewed_at', { ascending: true })

    const performance: PerformanceEntry[] = (perfRows ?? []).map((r: Record<string, unknown>) => ({
      taskId: r.task_id as string,
      score: r.score as number,
      ewmaSnapshot: Number(r.ewma_snapshot),
      level: r.level as string,
      reviewedAt: r.reviewed_at as string,
    }))

    const scores = performance.map(p => p.score)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const latestEwma = performance.length > 0 ? performance[performance.length - 1].ewmaSnapshot : null

    const response: BenderIdentityResponse = {
      slug: identity.bender_slug,
      displayName: identity.display_name,
      benderName: identity.bender_name,
      expertise: (identity.expertise as string[]) ?? [],
      platforms: (identity.platforms as string[]) ?? [],
      retiredAt: identity.retired_at,
      performance,
      taskStats: { total: performance.length, avgScore, latestEwma },
    }

    return NextResponse.json({ data: response, cached: false })
  } catch (error) {
    console.error('Error fetching bender identity:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch bender identity' } },
      { status: 500 }
    )
  }
}
