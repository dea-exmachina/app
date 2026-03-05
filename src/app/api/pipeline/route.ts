import { NextRequest, NextResponse } from 'next/server'
import { usersTables as tables } from '@/lib/server/users-database'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'summary'

  try {
    if (view === 'summary') {
      // Latest run + state counts
      const [runsResult, jobsResult] = await Promise.all([
        tables.job_pipeline_runs
          .select('*')
          .order('started_at', { ascending: false })
          .limit(1),
        tables.job_pipeline_jobs
          .select('state'),
      ])

      if (runsResult.error) throw runsResult.error
      if (jobsResult.error) throw jobsResult.error

      const latestRun = runsResult.data?.[0] || null

      // Count by state
      const stateCounts: Record<string, number> = {}
      for (const row of jobsResult.data || []) {
        const s = (row as { state: string }).state
        stateCounts[s] = (stateCounts[s] || 0) + 1
      }

      return NextResponse.json({
        data: { latestRun, stateCounts, totalJobs: jobsResult.data?.length || 0 },
        cached: false,
      })
    }

    if (view === 'runs') {
      const { data, error } = await tables.job_pipeline_runs
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return NextResponse.json({ data, cached: false })
    }

    if (view === 'jobs') {
      const state = searchParams.get('state')
      let query = tables.job_pipeline_jobs
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (state) {
        query = query.eq('state', state)
      }

      const { data, error } = await query
      if (error) throw error
      return NextResponse.json({ data, cached: false })
    }

    return NextResponse.json(
      { error: { code: 'INVALID_VIEW', message: `Unknown view: ${view}` } },
      { status: 400 }
    )
  } catch (error) {
    console.error('Pipeline API error:', error)
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Failed to fetch pipeline data' } },
      { status: 500 }
    )
  }
}
