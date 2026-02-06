import { parseFrontmatter, splitSections } from './common'
import type { ProjectLegacy as Project } from '@/types/project'

interface ProjectFrontmatter {
  type?: string
  domain?: string
  status?: string
  created?: string
}

/**
 * Parse a brief.md file into a Project object.
 * Expects YAML frontmatter with domain, status, created.
 * Extracts name from first # heading and overview from ## Overview section.
 */
export function parseProjectBrief(
  content: string,
  projectId: string,
  files: string[]
): Project {
  const { data: fm, content: body } = parseFrontmatter<ProjectFrontmatter>(content)

  // Extract name from first # heading
  const headingMatch = body.match(/^#\s+(.+)$/m)
  const name = headingMatch ? headingMatch[1].trim() : projectId

  // Extract overview from ## Overview section
  const sections = splitSections(body)
  const overviewSection = sections.find(
    (s) => s.heading.toLowerCase() === 'overview' && s.level === 2
  )

  // Get first paragraph (non-empty lines before a blank line)
  let overview = ''
  if (overviewSection) {
    const lines = overviewSection.content.split('\n')
    const paragraphLines: string[] = []
    for (const line of lines) {
      if (line.trim() === '' && paragraphLines.length > 0) break
      if (line.trim() !== '') paragraphLines.push(line.trim())
    }
    overview = paragraphLines.join(' ')
  }

  return {
    id: projectId,
    name,
    domain: fm.domain ?? 'unknown',
    status: fm.status ?? 'unknown',
    created: fm.created ?? '',
    overview,
    files,
  }
}
