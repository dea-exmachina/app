import type { Workflow, WorkflowSection } from '@/types/workflow'
import { parseFrontmatter, splitSections } from './common'

/**
 * Parse workflow markdown file with YAML frontmatter.
 */
export function parseWorkflow(
  content: string,
  filePath: string
): Workflow {
  const { data, content: markdownContent } = parseFrontmatter<{
    type?: string
    workflow_type?: string
    trigger?: string
    skill?: string
    status?: string
    created?: string
  }>(content)

  // Extract name from file path
  const name = filePath.split('/').pop()?.replace('.md', '') || 'untitled'

  // Split into sections
  const sections = splitSections(markdownContent)

  // Extract title from first heading (if exists) or use name
  const title = sections.find((s) => s.level === 1)?.heading || name

  // Extract purpose from "## Purpose" section
  const purposeSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Purpose'
  )
  const purpose = purposeSection?.content || ''

  // Extract prerequisites from "## Prerequisites" section
  const prereqSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Prerequisites'
  )
  const prerequisites = prereqSection
    ? parseCheckboxItems(prereqSection.content)
    : []

  // Filter out special sections (title, purpose, prerequisites)
  const filteredSections = sections.filter(
    (s) =>
      !(s.level === 1) &&
      !(s.level === 2 && (s.heading === 'Purpose' || s.heading === 'Prerequisites'))
  )

  return {
    name,
    title,
    workflowType: (data.workflow_type || 'goal') as 'goal' | 'explicit' | 'goal-oriented',
    trigger: data.trigger || '',
    skill: data.skill || null,
    status: (data.status || 'active') as 'active' | 'deprecated',
    created: data.created || '',
    purpose,
    filePath,
    sections: filteredSections,
    prerequisites,
  }
}

/** Parse checkbox/bullet items from content */
function parseCheckboxItems(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.match(/^-\s+(\[[ x]\]\s+)?/))
    .map((line) =>
      line
        .replace(/^-\s+\[[ x]\]\s+/, '')
        .replace(/^-\s+/, '')
        .trim()
    )
    .filter(Boolean)
}
