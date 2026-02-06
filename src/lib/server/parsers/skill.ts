import type { Skill, SkillCategory } from '@/types/skill'
import { CATEGORY_MAP } from '@/config/categories'

/**
 * Parse dea-skilllist.md into structured skills array.
 * Format: Category headings followed by table rows.
 */
export function parseSkillList(content: string): Skill[] {
  const skills: Skill[] = []
  const lines = content.split('\n')

  let currentCategory: SkillCategory | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect category heading
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      const heading = headingMatch[1].trim()
      const categoryInfo = CATEGORY_MAP[heading]
      if (categoryInfo) {
        currentCategory = categoryInfo.slug
      }
      continue
    }

    // Skip non-table lines
    if (!line.startsWith('|')) continue

    // Skip table header and separator rows
    if (line.includes('---') || line.includes('Skill') || line.includes('Description')) {
      continue
    }

    // Parse table row
    if (currentCategory) {
      const skill = parseSkillRow(line, currentCategory)
      if (skill) {
        skills.push(skill)
      }
    }
  }

  return skills
}

/** Parse a single skill table row */
function parseSkillRow(
  line: string,
  category: SkillCategory
): Skill | null {
  // Format: | /skill-name | Description text | workflow-file.md or — | status |
  const parts = line
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length < 4) return null

  const [name, description, workflow, status] = parts

  // Parse workflow (may be em dash "—" for null)
  const workflowValue =
    workflow === '—' || workflow === '-' || workflow === '' ? null : workflow

  // Parse status
  const statusValue = (status.toLowerCase() === 'active'
    ? 'active'
    : status.toLowerCase() === 'deprecated'
      ? 'deprecated'
      : 'planned') as 'active' | 'deprecated' | 'planned'

  return {
    name,
    description,
    category,
    workflow: workflowValue,
    status: statusValue,
  }
}
