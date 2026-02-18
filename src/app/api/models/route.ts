import { NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Database } from '@/types/supabase'

type ModelLibraryRow = Database['public']['Tables']['model_library']['Row']

export async function GET(): Promise<
  NextResponse<ApiResponse<ModelLibraryRow[]> | ApiError>
> {
  try {
    const { data, error } = await tables.model_library
      .select('*')
      .order('cost_tier')

    if (error) {
      throw error
    }

    return NextResponse.json({ data: data ?? [], cached: false })
  } catch (error) {
    console.error('Error fetching model library:', error)
    return NextResponse.json(
      {
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch model library',
        },
      },
      { status: 500 }
    )
  }
}
