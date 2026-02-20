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
  // Extract ## Handoff section using indexOf (more reliable than regex with multiline)
  const handoffIdx = markdown.indexOf('\n## Handoff')
  if (handoffIdx === -1 && !markdown.startsWith('## Handoff')) return null

  const start = handoffIdx === -1 ? 0 : handoffIdx + 1
  const afterHeader = markdown.substring(start + '## Handoff'.length).trimStart()

  // Find end: next ## heading or --- separator
  const endMatch = afterHeader.match(/\n## [^#]|\n---\s*(?:\n|$)/)
  const section = endMatch
    ? afterHeader.substring(0, endMatch.index!)
    : afterHeader

  // Parse **Updated**: value
  const updated =
    section.match(/\*\*Updated\*\*:\s*(.+)/)?.[1]?.trim() ?? ''

  // Parse **Context**: value
  const context =
    section.match(/\*\*Context\*\*:\s*(.+)/)?.[1]?.trim() ?? ''

  // Parse ### Next — numbered list items
  const nextItems = parseListAfterHeading(section, 'Next')

  // Parse ### Where We Left Off — positional: first KV = project, second = state, third = location
  const whereSection = extractSubsection(section, 'Where We Left Off')
  const whereKV = parseBoldKeyValues(whereSection ?? '')
  const project  = whereKV[0]?.value ?? ''
  const state    = whereKV[1]?.value ?? ''
  const location = (whereKV[2]?.value ?? '').replace(/`/g, '')

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
  const marker = `### ${heading}`
  const idx = section.indexOf(marker)
  if (idx === -1) return null

  const afterHeader = section.substring(idx + marker.length).replace(/^\s*\n/, '')
  const nextHeading = afterHeader.indexOf('\n### ')
  return nextHeading === -1 ? afterHeader : afterHeader.substring(0, nextHeading)
}

function parseListAfterHeading(section: string, heading: string): string[] {
  const sub = extractSubsection(section, heading)
  if (!sub) return []

  return sub
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+\.\s*|-\s*)/, '').trim())
    .filter(Boolean)
}

function parseBoldKeyValues(
  section: string
): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = []
  for (const line of section.split('\n')) {
    // Match: - **Key**: value  (leading bullet optional)
    const m = line.match(/^\s*(?:-\s*)?\*\*([^*]+)\*\*:\s*(.+)/)
    if (m) results.push({ key: m[1].trim(), value: m[2].trim() })
  }
  return results
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
