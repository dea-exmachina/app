import { parseFrontmatter } from './common'
import type { InboxItem, InboxItemType, InboxItemStatus } from '@/types/inbox'

interface InboxFrontmatter {
  type?: string
  status?: string
  created?: string
  source?: string
}

/**
 * Parse an inbox markdown file into an InboxItem.
 * Expects YAML frontmatter with type, created, source.
 * Title comes from first # heading; content is the rest.
 */
export function parseInboxItem(
  rawContent: string,
  filename: string,
  sha: string | null
): InboxItem {
  const { data: fm, content: body } = parseFrontmatter<InboxFrontmatter>(rawContent)

  // Extract title from first # heading
  const headingMatch = body.match(/^#\s+(.+)$/m)
  const title = headingMatch ? headingMatch[1].trim() : filename.replace(/\.md$/, '')

  // Content is everything after the first heading
  let content = ''
  if (headingMatch) {
    const headingIndex = body.indexOf(headingMatch[0])
    content = body
      .slice(headingIndex + headingMatch[0].length)
      .trim()
  } else {
    content = body.trim()
  }

  const validTypes: InboxItemType[] = ['note', 'link', 'file', 'instruction']
  const type: InboxItemType = validTypes.includes(fm.type as InboxItemType)
    ? (fm.type as InboxItemType)
    : 'note'

  const validStatuses: InboxItemStatus[] = ['pending', 'processing', 'done']
  const status: InboxItemStatus = validStatuses.includes(fm.status as InboxItemStatus)
    ? (fm.status as InboxItemStatus)
    : 'pending'

  return {
    filename,
    title,
    type,
    status,
    created: fm.created ?? '',
    source: fm.source ?? 'unknown',
    content,
    sha,
  }
}
