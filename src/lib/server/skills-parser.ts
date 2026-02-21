/**
 * Skills Markdown Parser
 *
 * Parses tools/dea-skilllist.md from the vault into Skill[] records.
 * Section headings map to category slugs; table rows are individual skills.
 *
 * CC-109 | Skills Auto-Sync
 */

export interface ParsedSkill {
  name: string
  description: string
  category: string
  workflow: string | null
  status: 'active' | 'deprecated' | 'planned'
}

const CATEGORY_MAP: Record<string, string> = {
  'Meta-Skills': 'meta',
  'Identity': 'identity',
  'Bender Management': 'bender-management',
  'Session Management': 'session',
  'Content & Creative': 'content',
  'Development & Workflows': 'development',
  'Professional': 'professional',
}

// Sections to skip entirely
const SKIP_SECTIONS = new Set(['Planned Skills', 'Skill Development'])

/**
 * Parse a markdown table row into cells.
 * Handles `| cell | cell |` format, strips leading/trailing whitespace.
 */
function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // remove empty first/last from leading/trailing |
    .map((c) => c.trim())
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^[-: ]+$/.test(c))
}

function normalizeStatus(raw: string): 'active' | 'deprecated' | 'planned' {
  const s = raw.toLowerCase()
  if (s === 'deprecated') return 'deprecated'
  if (s === 'planned') return 'planned'
  return 'active'
}

function normalizeWorkflow(raw: string): string | null {
  if (!raw || raw === '—' || raw === '-' || raw === '') return null
  return raw
}

export function parseSkillsMarkdown(content: string): ParsedSkill[] {
  const skills: ParsedSkill[] = []
  const lines = content.split('\n')

  let currentCategory: string | null = null
  let inSkipSection = false

  for (const line of lines) {
    // Section heading
    if (line.startsWith('## ')) {
      const heading = line.replace(/^## /, '').trim()
      inSkipSection = SKIP_SECTIONS.has(heading)
      currentCategory = CATEGORY_MAP[heading] ?? null
      continue
    }

    if (inSkipSection || !currentCategory) continue

    // Table row
    if (!line.startsWith('|')) continue
    const cells = parseTableRow(line)
    if (cells.length < 2) continue
    if (isSeparatorRow(cells)) continue

    // Header row (first cell is "Skill" or similar)
    if (cells[0].toLowerCase() === 'skill') continue

    const rawName = cells[0] ?? ''
    const description = cells[1] ?? ''

    // Skip empty rows
    if (!rawName || !description) continue

    // Derive fields based on column count
    // 3-col: name | description | status
    // 4-col: name | description | workflow | status
    let workflow: string | null = null
    let status: 'active' | 'deprecated' | 'planned' = 'active'

    if (cells.length >= 4) {
      workflow = normalizeWorkflow(cells[2])
      status = normalizeStatus(cells[3])
    } else if (cells.length === 3) {
      // Could be either workflow or status in 3rd col — check if it looks like a status
      const third = cells[2]
      if (['active', 'deprecated', 'planned'].includes(third.toLowerCase())) {
        status = normalizeStatus(third)
      } else {
        workflow = normalizeWorkflow(third)
      }
    }

    const name = rawName.startsWith('/') ? rawName.slice(1) : rawName

    skills.push({ name, description, category: currentCategory, workflow, status })
  }

  return skills
}
