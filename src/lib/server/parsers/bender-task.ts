import type { BenderTask } from '@/types/bender'
import { parseFrontmatter, splitSections } from './common'

/**
 * Parse TASK-*.md bender task files.
 */
export function parseBenderTask(
  content: string,
  filePath: string
): BenderTask {
  const { data, content: markdownContent } = parseFrontmatter<{
    task_id?: string
    title?: string
    created?: string
    bender?: string
    status?: string
    priority?: string
    branch?: string
  }>(content)

  const sections = splitSections(markdownContent)

  // Extract overview
  const overviewSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Overview'
  )
  const overview = overviewSection?.content || ''

  // Extract requirements
  const reqSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Requirements'
  )
  const requirements = reqSection ? parseBulletList(reqSection.content) : []

  // Extract acceptance criteria
  const criteriaSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Acceptance Criteria'
  )
  const acceptanceCriteria = criteriaSection
    ? parseCheckboxTextOnly(criteriaSection.content)
    : []

  // Extract review section
  const reviewSection = sections.find(
    (s) => s.level === 2 && s.heading === 'Review'
  )
  const review = reviewSection ? parseReview(reviewSection.content) : null

  return {
    taskId: data.task_id || '',
    title: data.title || '',
    created: data.created || '',
    bender: data.bender || '',
    status: (data.status || 'proposed') as
      | 'proposed'
      | 'executing'
      | 'delivered'
      | 'integrated',
    priority: (data.priority || 'normal') as 'focus' | 'normal',
    branch: data.branch || 'dev',
    overview,
    requirements,
    acceptanceCriteria,
    review,
    filePath,
  }
}

/** Parse bullet list items */
function parseBulletList(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.match(/^-\s+/))
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean)
}

/** Parse checkbox items (text only, ignore checkbox state) */
function parseCheckboxTextOnly(content: string): string[] {
  return content
    .split('\n')
    .filter((line) => line.match(/^-\s+\[[ x]\]/i))
    .map((line) => line.replace(/^-\s+\[[ x]\]\s+/i, '').trim())
    .filter(Boolean)
}

/** Parse review section */
function parseReview(content: string): {
  decision: 'ACCEPT' | 'PARTIAL' | 'REJECT'
  feedback: string
} | null {
  const decisionMatch = content.match(
    /\*\*Decision\*\*:\s*(ACCEPT|PARTIAL|REJECT)/i
  )
  if (!decisionMatch) return null

  const decision = decisionMatch[1].toUpperCase() as
    | 'ACCEPT'
    | 'PARTIAL'
    | 'REJECT'

  // Feedback is everything after the decision line
  const feedbackStart = content.indexOf(decisionMatch[0]) + decisionMatch[0].length
  const feedback = content.substring(feedbackStart).trim()

  return { decision, feedback }
}
