import { NextResponse } from 'next/server'

export async function GET() {
  const diag: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_SERVICE_KEY_PREFIX: process.env.SUPABASE_SERVICE_KEY?.substring(0, 15),
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    diag.clientCreated = true

    const { data, error } = await db.from('nexus_cards').select('card_id').limit(1)
    diag.queryResult = error ? { error: error.message } : { count: data?.length }
  } catch (e: unknown) {
    diag.error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(diag)
}
