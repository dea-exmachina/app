import { NextResponse } from 'next/server'
import { db } from '@/lib/server/database'
import type { Database } from '@/types/supabase'

export type TaskTypeRoutingRow =
  Database['public']['Tables']['task_type_routing']['Row']

export async function GET() {
  const { data, error } = await db
    .from('task_type_routing')
    .select('*')
    .order('task_type')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, cached: false })
}
