/**
 * Parse the ## Handoff section from last-session.md into a HandoffSection object.
 *
 * Expected format:
 *   ## Handoff
 *   **Updated**: 2026-02-18 21:15
 *   **Context**: Some context text
 *   ### Next
 *   1. Item one
 *   2. Item two
 *   ### Where We Left Off
 *   - **Project**: ...
 *   - **State**: ...
 *   - **Location**: ...
 *   ### Blockers
 *   - Blocker one
 *   ### Benders
 *   - TASK-XXX (description): `status` — notes
 */

import type { HandoffSection } from '@/types/kanban'

export function parseHandoffSection(markdown: string): HandoffSection | null {
  // Extract ## Handoff section (everything between ## Handoff and next ## or end)
  const handoffMatch = markdown.match(
    /^## Handoff\s*\n([\s\S]*?)(?=\n## [^#]|\n---\s*$|$)/m
  )
  if (!handoffMatch) return null

  const section = handoffMatch[1]

  // Parse **Updated**: value
  const updated =
    section.match(/\*\*Updated\*\*:\s*(.+)/)?.[1]?.trim() ?? ''

  // Parse **Context**: value
  const context =
    section.match(/\*\*Context\*\*:\s*(.+)/)?.[1]?.trim() ?? ''

  // Parse ### Next — numbered list items
  const nextItems = parseListAfterHeading(section, 'Next')

  // Parse ### Where We Left Off
  const whereSection = extractSubsection(section, 'Where We Left Off')
  const project =
    whereSection?.match(/\*\*Project\*\*:\s*(.+)/)?.[1]?.trim() ?? ''
  const state =
    whereSection?.match(/\*\*State\*\*:\s*(.+)/)?.[1]?.trim() ?? ''
  const location =
    whereSection
      ?.match(/\*\*Location\*\*:\s*(.+)/)?.[1]
      ?.trim()
      ?.replace(/`/g, '') ?? ''

  // Parse ### Blockers
  const blockers = parseListAfterHeading(section, 'Blockers')

  // Parse ### Benders — TASK-XXX (description): `status`
  const benderStatus = parseBenderStatus(section)

  if (!updated && !context && nextItems.length === 0) return null

  return {
    updated,
    context,
    nextItems,
    whereWeLeftOff: { project, state, location },
    blockers,
    benderStatus,
  }
}

function extractSubsection(section: string, heading: string): string | null {
  const re = new RegExp(
    `### ${heading}\\s*\\n([\\s\\S]*?)(?=\\n### |$)`,
    'm'
  )
  return re.exec(section)?.[1] ?? null
}

function parseListAfterHeading(section: string, heading: string): string[] {
  const sub = extractSubsection(section, heading)
  if (!sub) return []

  return sub
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+\.\s*|-\s*)/, '').trim())
    .filter(Boolean)
}

function parseBenderStatus(
  section: string
): Array<{ taskId: string; description: string; status: string }> {
  const sub = extractSubsection(section, 'Benders')
  if (!sub) return []

  const results: Array<{
    taskId: string
    description: string
    status: string
  }> = []

  for (const line of sub.split('\n')) {
    // Match: - TASK-XXX (description): `status` — notes
    // or: - TASK-XXX description: `status`
    const m = line.match(
      /(?:TASK-\S+|\b[A-Z]+-\d+\b)\s*(?:\(([^)]+)\)|([^:]+)):\s*`([^`]+)`/
    )
    if (m) {
      const taskId = line.match(/(TASK-\S+|[A-Z]+-\d+)/)?.[1] ?? ''
      results.push({
        taskId,
        description: (m[1] ?? m[2] ?? '').trim(),
        status: m[3],
      })
    }
  }

  return results
}
