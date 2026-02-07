/**
 * Seed kanban_boards from vault markdown files.
 *
 * Reads kanban markdown files and portfolio kanban files, parses lanes+cards,
 * and upserts into Supabase kanban_boards table.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-kanban.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Vault path — adjust if needed
const VAULT = process.env.VAULT_PATH || 'D:\\ProtonDrive\\My Files\\dea-exmachina'

interface KanbanCard {
  id: string
  title: string
  completed: boolean
  tags: string[]
  description: string | null
  metadata: Record<string, string>
  rawMarkdown: string
  startedAt?: string | null
  completedAt?: string | null
}

interface KanbanLane {
  name: string
  cards: KanbanCard[]
}

interface HandoffSection {
  updated: string
  context: string
  nextItems: string[]
  whereWeLeftOff: {
    project: string
    state: string
    location: string
  }
  blockers: string[]
  benderStatus: Array<{ taskId: string; description: string; status: string }>
}

const BOARDS = [
  { slug: 'management', name: 'Management', file: 'kanban/management.md', projectId: null },
  { slug: 'bender', name: 'Bender Tasks', file: 'kanban/bender.md', projectId: null },
  { slug: 'job-search', name: 'Job Search', file: 'kanban/job-search.md', projectId: null },
  { slug: 'kerkoporta', name: 'Kerkoporta', file: 'portfolio/kerkoporta/kanban.md', projectId: null },
  { slug: 'control-center', name: 'Control Center', file: 'portfolio/control-center/kanban.md', projectId: null },
]

function parseCard(line: string, index: number): KanbanCard {
  const completed = line.startsWith('- [x]')
  const raw = line.replace(/^- \[[ x]\]\s*/, '')

  // Extract title: **Bold Title** or first text
  const titleMatch = raw.match(/\*\*([^*]+)\*\*/)
  const title = titleMatch ? titleMatch[1] : raw.split('<br>')[0].trim()

  // Extract tags: #word
  const tags = [...raw.matchAll(/#(\S+)/g)].map((m) => m[1])

  // Extract description after <br>
  const brParts = raw.split(/<br\s*\/?>/i)
  const description = brParts.length > 1 ? brParts.slice(1).join('\n').trim() : null

  // Extract metadata key-value pairs: **Key**: value
  const metadata: Record<string, string> = {}
  const metaMatches = raw.matchAll(/\*\*(\w[\w\s]*?)\*\*:\s*([^<*]+)/g)
  for (const m of metaMatches) {
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '_')
    if (key !== title.toLowerCase().replace(/\s+/g, '_')) {
      metadata[key] = m[2].trim()
    }
  }

  // Extract dates
  const startMatch = raw.match(/\*\*Started\*\*:\s*([\d-]+)/)
  const completeMatch = raw.match(/\*\*Completed\*\*:\s*([\d-]+)/)

  return {
    id: `card-${index}`,
    title,
    completed,
    tags,
    description,
    metadata,
    rawMarkdown: line,
    startedAt: startMatch?.[1] ?? null,
    completedAt: completeMatch?.[1] ?? null,
  }
}

function parseHandoff(content: string): HandoffSection | null {
  // Normalize CRLF to LF for consistent regex matching
  const normalized = content.replace(/\r\n/g, '\n')
  const handoffMatch = normalized.match(/## Handoff\n([\s\S]*?)(?=\n## (?!#)|$)/)
  if (!handoffMatch) return null

  const section = handoffMatch[1]

  const updated = section.match(/\*\*Updated\*\*:\s*(.+)/)?.[1]?.trim() ?? ''
  const context = section.match(/\*\*Context\*\*:\s*(.+)/)?.[1]?.trim() ?? ''

  // Parse Next items
  const nextMatch = section.match(/### Next\n([\s\S]*?)(?=\n### |$)/)
  const nextItems = nextMatch
    ? [...nextMatch[1].matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => m[1].trim())
    : []

  // Parse Where We Left Off
  const leftOffMatch = section.match(/### Where We Left Off\n([\s\S]*?)(?=\n### |$)/)
  const leftOff = leftOffMatch?.[1] ?? ''
  const whereWeLeftOff = {
    project: leftOff.match(/\*\*Project\*\*:\s*(.+)/)?.[1]?.trim() ?? '',
    state: leftOff.match(/\*\*State\*\*:\s*(.+)/)?.[1]?.trim() ?? '',
    location: leftOff.match(/\*\*(?:Repos?|Location)\*\*:\s*(.+)/)?.[1]?.trim() ?? '',
  }

  // Parse Blockers
  const blockersMatch = section.match(/### Blockers\n([\s\S]*?)(?=\n### |$)/)
  const blockers = blockersMatch
    ? [...blockersMatch[1].matchAll(/^- (.+)$/gm)].map((m) => m[1].trim())
    : []

  // Parse Benders
  const bendersMatch = section.match(/### Benders\n([\s\S]*?)(?=\n### |$)/)
  const benderStatus = bendersMatch
    ? [...bendersMatch[1].matchAll(/^- (.+)$/gm)].map((m) => ({
        taskId: '',
        description: m[1].trim(),
        status: 'unknown',
      }))
    : []

  return { updated, context, nextItems, whereWeLeftOff, blockers, benderStatus }
}

function parseKanban(content: string): { lanes: KanbanLane[]; handoff: HandoffSection | null } {
  // Normalize CRLF to LF, strip frontmatter
  const stripped = content.replace(/\r\n/g, '\n').replace(/^---[\s\S]*?---\n*/, '')

  const handoff = parseHandoff(stripped)

  const lanes: KanbanLane[] = []
  // Match ## headers that are lane names (skip Handoff and kanban settings)
  const laneRegex = /^## (.+)$/gm
  const matches = [...stripped.matchAll(laneRegex)]

  for (let i = 0; i < matches.length; i++) {
    const laneName = matches[i][1].trim()
    if (laneName === 'Handoff' || laneName.startsWith('kanban:')) continue

    const start = matches[i].index! + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index! : stripped.length

    const laneContent = stripped.slice(start, end)

    // Stop at kanban settings block
    const settingsIdx = laneContent.indexOf('%% kanban:settings')
    const cleanContent = settingsIdx >= 0 ? laneContent.slice(0, settingsIdx) : laneContent

    // Parse card lines
    const cardLines = cleanContent
      .split('\n')
      .filter((l) => l.match(/^- \[[ x]\]/))

    let cardIndex = 0
    const cards = cardLines.map((line) => parseCard(line, cardIndex++))

    lanes.push({ name: laneName, cards })
  }

  return { lanes, handoff }
}

async function seed() {
  console.log('Seeding kanban_boards from vault...\n')

  // Get a project ID for linking (use dea-system as default)
  const { data: sysProject } = await db
    .from('projects')
    .select('id')
    .eq('slug', 'dea-system')
    .single()

  const defaultProjectId = sysProject?.id ?? null

  for (const board of BOARDS) {
    const filePath = path.join(VAULT, board.file)

    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${board.slug} — file not found: ${board.file}`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const { lanes, handoff } = parseKanban(content)

    const totalCards = lanes.reduce((sum, l) => sum + l.cards.length, 0)

    const row = {
      slug: board.slug,
      name: board.name,
      project_id: board.projectId ?? defaultProjectId,
      markdown_path: board.file,
      lanes: JSON.parse(JSON.stringify(lanes)),
      handoff: handoff ? JSON.parse(JSON.stringify(handoff)) : null,
    }

    const { error } = await db
      .from('kanban_boards')
      .upsert(row, { onConflict: 'slug' })

    if (error) {
      console.log(`  FAIL: ${board.slug} — ${error.message}`)
    } else {
      console.log(`  OK: ${board.slug} — ${lanes.length} lanes, ${totalCards} cards`)
    }
  }

  console.log('\nDone. Verifying...\n')

  const { data: all } = await db
    .from('kanban_boards')
    .select('slug, name')
    .order('name')

  console.table(all)
}

seed().catch(console.error)
