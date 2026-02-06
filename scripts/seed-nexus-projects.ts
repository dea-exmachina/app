/**
 * Seed NEXUS projects table from existing vault structure.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-nexus-projects.ts
 *
 * DEA-042 | NEXUS Phase 0
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const projects = [
  {
    slug: 'dea-system',
    name: 'dea-exmachina (System)',
    delegation_policy: 'delegation-first',
    override_reason: null,
    protected_paths: [
      'CLAUDE.md',
      'DESIGN.md',
      'META-FRAMEWORK.md',
      'benders/context/shared/',
      'identity/',
      'kanban/management.md',
    ],
    repo_url: 'https://github.com/george-a-ata/dea-exmachina',
    metadata: {
      domain: 'meta',
      description: 'Core system infrastructure, meta-framework, agent management',
    },
  },
  {
    slug: 'control-center',
    name: 'Control Center',
    delegation_policy: 'delegation-first',
    override_reason: null,
    protected_paths: null,
    repo_url: 'https://github.com/george-a-ata/control-center',
    metadata: {
      domain: 'business/ventures',
      description: 'Web dashboard for visual interaction with dea-exmachina',
      local_path: 'D:\\dev\\control-center',
    },
  },
  {
    slug: 'kerkoporta',
    name: 'Kerkoporta',
    delegation_policy: 'dea-only',
    override_reason: 'Personal voice, brand sensitivity',
    protected_paths: null,
    repo_url: null,
    metadata: {
      domain: 'creative/content',
      description: 'Intellectual long-form essays — finance, history, philosophy, geopolitics',
    },
  },
  {
    slug: 'kerrigan',
    name: 'KERRIGAN',
    delegation_policy: 'delegation-first',
    override_reason: null,
    protected_paths: null,
    repo_url: null,
    metadata: {
      domain: 'meta',
      description: 'Meta-system: HIVE (factory) + QUEEN (external sync) + CREEP (context) = THE SWARM',
    },
  },
  {
    slug: 'nexus',
    name: 'NEXUS',
    delegation_policy: 'delegation-first',
    override_reason: null,
    protected_paths: null,
    repo_url: null,
    metadata: {
      domain: 'meta',
      description: 'Next-Gen Execution & Unified System — orchestration engine, locking, events, context',
    },
  },
]

async function seed() {
  console.log('Seeding nexus_projects...\n')

  for (const project of projects) {
    const { data, error } = await db
      .from('nexus_projects')
      .upsert(project, { onConflict: 'slug' })
      .select()
      .single()

    if (error) {
      console.error(`  FAIL: ${project.slug} — ${error.message}`)
    } else {
      console.log(`  OK: ${data.slug} (${data.id})`)
    }
  }

  console.log('\nDone. Verifying...\n')

  const { data: all, error: listError } = await db
    .from('nexus_projects')
    .select('slug, name, delegation_policy')
    .order('name')

  if (listError) {
    console.error('Verification failed:', listError.message)
  } else {
    console.table(all)
  }
}

seed().catch(console.error)
