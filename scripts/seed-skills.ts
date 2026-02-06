/**
 * Seed Skills from Markdown to Supabase
 *
 * Parses tools/dea-skilllist.md and inserts into Supabase skills table.
 * Run with: npx tsx --env-file=.env.local scripts/seed-skills.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  console.error('Run with: npx tsx --env-file=.env.local scripts/seed-skills.ts')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

type SkillCategory = 'meta' | 'identity' | 'bender-management' | 'session' | 'content' | 'development' | 'professional'
type SkillStatus = 'active' | 'deprecated' | 'planned'

interface Skill {
  name: string
  description: string
  category: SkillCategory
  workflow: string | null
  status: SkillStatus
}

// Skills data parsed from dea-skilllist.md
const skills: Skill[] = [
  // Meta-Skills
  { name: 'dea-template-create', description: 'Create new Templater templates', category: 'meta', workflow: 'template-creation.md', status: 'active' },
  { name: 'dea-workflow-create', description: 'Create new workflows', category: 'meta', workflow: null, status: 'active' },
  { name: 'dea-workflow-template-creation', description: 'Execute template creation workflow', category: 'meta', workflow: 'template-creation.md', status: 'active' },
  { name: 'dea-workflow-template-testing', description: 'Execute template testing workflow', category: 'meta', workflow: 'template-testing.md', status: 'active' },

  // Identity
  { name: 'dea-identity', description: 'Establish or load identity context (setup/load/calibrate modes)', category: 'identity', workflow: 'identity-setup.md', status: 'active' },

  // Bender Management
  { name: 'dea-bender-assign', description: 'Assign tasks to bender agents', category: 'bender-management', workflow: 'bender-assign.md', status: 'active' },
  { name: 'dea-bender-review', description: 'Review bender deliverables and provide feedback', category: 'bender-management', workflow: 'bender-review.md', status: 'active' },

  // Session Management
  { name: 'dea-goodmorning', description: 'Resume from last session', category: 'session', workflow: null, status: 'active' },
  { name: 'dea-dfd', description: 'End-of-session wrap-up', category: 'session', workflow: null, status: 'active' },
  { name: 'dea-consolidate', description: 'Consolidate session learnings (update docs, flag patterns)', category: 'session', workflow: 'session-consolidate.md', status: 'active' },
  { name: 'dea-status', description: 'Show active projects and TODO items', category: 'session', workflow: null, status: 'active' },

  // Content & Creative
  { name: 'dea-kerkoporta', description: 'Bootstrap Kerkoporta writing session', category: 'content', workflow: null, status: 'active' },
  { name: 'dea-kerkopublish', description: 'Publish Kerkoporta article', category: 'content', workflow: null, status: 'active' },

  // Development & Workflows
  { name: 'dea-interview', description: 'Deep-dive interview for task definition', category: 'development', workflow: null, status: 'active' },
  { name: 'dea-gitupload', description: 'Run git upload workflow', category: 'development', workflow: null, status: 'active' },

  // Professional
  { name: 'dea-job', description: 'Job application system (apply, interview prep, boss hunting)', category: 'professional', workflow: 'job-search.md', status: 'active' },
  { name: 'dea-learn', description: 'Weekly review and knowledge consolidation', category: 'professional', workflow: null, status: 'active' },
]

async function seedSkills() {
  console.log(`Seeding ${skills.length} skills to Supabase...`)

  // Upsert skills (insert or update on conflict)
  const { data, error } = await db
    .from('skills')
    .upsert(skills, { onConflict: 'name' })
    .select()

  if (error) {
    console.error('Error seeding skills:', error)
    process.exit(1)
  }

  console.log(`Successfully seeded ${data?.length ?? 0} skills`)

  // List what was seeded
  for (const skill of data ?? []) {
    console.log(`  ✓ ${skill.name} (${skill.category})`)
  }
}

seedSkills()
