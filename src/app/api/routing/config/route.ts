import { NextResponse } from 'next/server'
import { db } from '@/lib/server/database'

export async function GET() {
  const { data, error } = await db
    .from('task_type_routing')
    .select('*')
    .order('task_type')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const body = await request.json()

  const { task_type, default_model } = body

  if (!task_type || !default_model) {
    return NextResponse.json(
      { error: 'task_type and default_model are required' },
      { status: 400 }
    )
  }

  // Check governance constraint
  const { data: existing } = await db
    .from('task_type_routing')
    .select('is_governance')
    .eq('task_type', task_type)
    .single()

  if (existing?.is_governance && !default_model.startsWith('claude')) {
    return NextResponse.json(
      { error: 'Governance tasks require a Claude model' },
      { status: 400 }
    )
  }

  const { data, error } = await db
    .from('task_type_routing')
    .update({ default_model })
    .eq('task_type', task_type)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
