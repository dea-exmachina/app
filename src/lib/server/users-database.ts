/**
 * Users Database Client (dea-nexus-users)
 *
 * Separate Supabase client for user-scoped data that lives on
 * dea-nexus-users (aospwxlomkwpntmbnoee), not on the main
 * dea-exmachina-prod instance.
 *
 * Tables: job_pipeline_runs, job_pipeline_jobs
 *
 * Uses service role key — same pattern as main database.ts.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _usersDb: SupabaseClient | null = null

export function getUsersDb(): SupabaseClient {
  if (!_usersDb) {
    const url = process.env.USERS_SUPABASE_URL
    const key = process.env.USERS_SUPABASE_SERVICE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing USERS_SUPABASE_URL or USERS_SUPABASE_SERVICE_KEY env vars'
      )
    }

    _usersDb = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _usersDb
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const usersDb: SupabaseClient = new Proxy({} as any, {
  get(_, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getUsersDb() as any)[prop]
  },
})

export const usersTables = {
  get job_pipeline_runs() { return usersDb.from('job_pipeline_runs') },
  get job_pipeline_jobs() { return usersDb.from('job_pipeline_jobs') },
}
