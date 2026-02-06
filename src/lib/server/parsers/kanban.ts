import type {
  KanbanBoard,
  KanbanLane,
  KanbanCard,
  HandoffSection,
} from '@/types/kanban'
import { parseCheckboxLine, extractTags, extractMetadata } from './common'

/**
 * Parse markdown kanban board into structured data.
 * Handles Obsidian kanban-plugin format with Handoff section for management board.
 */
export function parseKanbanBoard(
  content: string,
  id: string,
  filePath: string
): KanbanBoard {
  const lines = content.split('\n')
  let handoff: HandoffSection | null = null
  const lanes: KanbanLane[] = []

  let currentSection: string | null = null
  let currentLane: { name: string; lines: string[] } | null = null
  let inHandoff = false
  let handoffLines: string[] = []

  for (const line of lines) {
    // Skip frontmatter, settings blocks, and horizontal rules
    if (
      line.trim() === '---' ||
      line.includes('kanban-plugin') ||
      line.includes('%%')
    ) {
      continue
    }

    // Detect section headings
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      const heading = headingMatch[1].trim()

      // Save previous lane
      if (currentLane && !inHandoff) {
        lanes.push(parseLane(currentLane.name, currentLane.lines))
      }

      // Handle Handoff section
      if (heading === 'Handoff') {
        inHandoff = true
        handoffLines = []
        currentLane = null
        currentSection = 'Handoff'
      } else {
        // Regular lane
        if (inHandoff) {
          // Parse accumulated handoff lines
          handoff = parseHandoffSection(handoffLines)
          inHandoff = false
        }

        currentLane = { name: heading, lines: [] }
        currentSection = heading
      }
      continue
    }

    // Accumulate lines for current section
    if (inHandoff) {
      handoffLines.push(line)
    } else if (currentLane) {
      currentLane.lines.push(line)
    }
  }

  // Save final lane
  if (currentLane && !inHandoff) {
    lanes.push(parseLane(currentLane.name, currentLane.lines))
  }

  // Parse final handoff if we were still in it
  if (inHandoff && handoffLines.length > 0) {
    handoff = parseHandoffSection(handoffLines)
  }

  // Extract board name from ID
  const boardName =
    id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Untitled Board'

  return {
    id,
    name: boardName,
    filePath,
    handoff,
    lanes,
  }
}

/** Parse a single lane section into structured cards */
function parseLane(name: string, lines: string[]): KanbanLane {
  const cards: KanbanCard[] = []
  let currentCardLines: string[] = []
  let currentCardCheckbox: ReturnType<typeof parseCheckboxLine> | null = null

  const flushCard = () => {
    if (currentCardCheckbox && currentCardLines.length > 0) {
      const card = parseCard(
        currentCardCheckbox,
        currentCardLines.join('\n')
      )
      if (card) {
        cards.push(card)
      }
    }
    currentCardLines = []
    currentCardCheckbox = null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check if this is a new card
    const checkbox = parseCheckboxLine(trimmed)
    if (checkbox) {
      flushCard()
      currentCardCheckbox = checkbox
      currentCardLines.push(checkbox.text)
    } else if (currentCardCheckbox) {
      // Continuation of current card
      currentCardLines.push(trimmed)
    }
  }

  flushCard()

  return { name, cards }
}

/** Parse a single card from checkbox state and accumulated lines */
function parseCard(
  checkbox: { completed: boolean; text: string },
  rawText: string
): KanbanCard | null {
  // Cards use <br> as field separators — normalize to newlines for parsing
  const normalizedText = rawText.replace(/<br\s*\/?>/gi, '\n')

  // Extract card ID and title from first line
  // Format: **ID: Title** or just text
  const idMatch = normalizedText.match(/^\*\*([A-Z]+-\d+):\s*([^*]+)\*\*/)

  let id: string
  let title: string

  if (idMatch) {
    id = idMatch[1]
    title = idMatch[2].trim()
  } else {
    // No ID pattern, use raw text as title
    const firstLine = normalizedText.split('\n')[0].replace(/^\*\*|\*\*$/g, '').trim()
    id = firstLine.substring(0, 20) // Use first 20 chars as fallback ID
    title = firstLine
  }

  // Extract tags
  const tags = extractTags(normalizedText)

  // Extract metadata
  const metadata = extractMetadata(normalizedText)

  // Build description from lines after first line (excluding metadata)
  const lines = normalizedText.split('\n').slice(1)
  const descriptionLines = lines.filter(
    (line) => !line.match(/^\*\*[^*]+\*\*:/) && line.trim() !== ''
  )
  const description =
    descriptionLines.length > 0 ? descriptionLines.join('\n').trim() : null

  return {
    id,
    title,
    completed: checkbox.completed,
    tags,
    description,
    metadata,
    rawMarkdown: rawText,
  }
}

/** Parse the Handoff section from management.md */
function parseHandoffSection(lines: string[]): HandoffSection | null {
  const text = lines.join('\n')

  // Extract metadata
  const metadata = extractMetadata(text)

  // Parse sections
  const sections = text.split(/###\s+/)

  let nextItems: string[] = []
  let whereWeLeftOff = { project: '', state: '', location: '' }
  let blockers: string[] = []
  let benderStatus: Array<{ taskId: string; description: string; status: string }> =
    []

  for (const section of sections) {
    const [heading, ...contentLines] = section.split('\n')
    const content = contentLines.join('\n').trim()

    if (!heading) continue

    if (heading.trim() === 'Next') {
      // Parse numbered list
      nextItems = content
        .split('\n')
        .filter((line) => line.match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    } else if (heading.trim() === 'Where We Left Off') {
      // Parse metadata fields
      const meta = extractMetadata(content)
      whereWeLeftOff = {
        project: meta.Project || '',
        state: meta.State || '',
        location: meta.Location || '',
      }
    } else if (heading.trim() === 'Blockers') {
      // Parse bullet list
      blockers = content
        .split('\n')
        .filter((line) => line.match(/^-\s+/))
        .map((line) => line.replace(/^-\s+/, '').trim())
        .filter(Boolean)
    } else if (heading.trim() === 'Benders') {
      // Parse bender status lines: "- TASK-005: Description → Status"
      benderStatus = content
        .split('\n')
        .filter((line) => line.match(/^-\s+TASK-\d+:/))
        .map((line) => {
          const match = line.match(
            /^-\s+(TASK-\d+):\s*([^→]+)(?:→\s*(.+))?$/
          )
          if (!match) return null

          return {
            taskId: match[1],
            description: match[2].trim(),
            status: match[3]?.trim() || 'unknown',
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    }
  }

  return {
    updated: metadata.Updated || '',
    context: metadata.Context || '',
    nextItems,
    whereWeLeftOff,
    blockers,
    benderStatus,
  }
}
