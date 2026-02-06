import type { BenderTeam, BenderAgent } from '@/types/bender'
import { splitSections } from './common'

/**
 * Parse bender team manifest files.
 */
export function parseBenderTeam(
  content: string,
  filePath: string
): BenderTeam {
  const sections = splitSections(content)

  // Extract name from title
  const titleSection = sections.find((s) => s.level === 1)
  const nameMatch = titleSection?.heading.match(/^Team:\s*(.+)$/)
  const name = nameMatch ? nameMatch[1].trim() : 'Unnamed Team'

  // Parse Members table
  const membersSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Members'
  )
  const members = membersSection
    ? parseMembersTable(membersSection.content, name)
    : []

  // Extract sequencing section
  const sequencingSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Sequencing'
  )
  const sequencing = sequencingSection?.content || ''

  // Parse File Ownership table
  const ownershipSection = sections.find(
    (s) => s.level === 2 && s.heading === 'File Ownership'
  )
  const fileOwnership = ownershipSection
    ? parseFileOwnershipTable(ownershipSection.content)
    : {}

  // Extract branch strategy section
  const branchSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Branch Strategy'
  )
  const branchStrategy = branchSection?.content || ''

  return {
    name,
    members,
    sequencing,
    fileOwnership,
    branchStrategy,
  }
}

/** Parse members table */
function parseMembersTable(content: string, teamName: string): BenderAgent[] {
  const members: BenderAgent[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (!line.startsWith('|')) continue
    if (line.includes('---') || line.includes('Role')) continue

    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length >= 4) {
      const [role, canonicalDef, platform, sequencing] = parts

      // Extract invocation from later sections or construct it
      // For Claude Code agents, it's @{role-lowercase}
      const invocation = `@${role.toLowerCase().replace(/\s+/g, '-')}`

      members.push({
        name: `bender+${role.toLowerCase().replace(/\s+/g, '-')}`,
        role,
        platform,
        invocation,
        team: teamName,
      })
    }
  }

  return members
}

/** Parse file ownership table */
function parseFileOwnershipTable(
  content: string
): Record<string, { owns: string[]; mustNotTouch: string[] }> {
  const ownership: Record<string, { owns: string[]; mustNotTouch: string[] }> =
    {}
  const lines = content.split('\n')

  for (const line of lines) {
    if (!line.startsWith('|')) continue
    if (line.includes('---') || line.includes('Role')) continue

    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length >= 3) {
      const [role, owns, mustNotTouch] = parts

      ownership[role] = {
        owns: owns
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        mustNotTouch: mustNotTouch
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
    }
  }

  return ownership
}
