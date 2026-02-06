import matter from 'gray-matter'

/**
 * Common parser utilities shared across all markdown parsers
 */

/** Extract YAML frontmatter from markdown content */
export function parseFrontmatter<T = Record<string, unknown>>(
  content: string
): { data: T; content: string } {
  const result = matter(content)
  return { data: result.data as T, content: result.content }
}

/** Parse checkbox line (- [ ] or - [x]) */
export function parseCheckboxLine(line: string): {
  completed: boolean
  text: string
} | null {
  const match = line.match(/^-\s+\[([ x])\]\s+(.+)$/i)
  if (!match) return null

  return {
    completed: match[1].toLowerCase() === 'x',
    text: match[2].trim(),
  }
}

/** Extract hashtags from text */
export function extractTags(text: string): string[] {
  const tagPattern = /#([a-zA-Z0-9_-]+)/g
  const matches = text.matchAll(tagPattern)
  return Array.from(matches, (m) => `#${m[1]}`)
}

/** Extract metadata fields in **Key**: Value format */
export function extractMetadata(text: string): Record<string, string> {
  const metadata: Record<string, string> = {}
  const metadataPattern = /\*\*([^*]+)\*\*:\s*([^\n<]+)/g

  for (const match of text.matchAll(metadataPattern)) {
    const key = match[1].trim()
    const value = match[2].trim()
    metadata[key] = value
  }

  return metadata
}

/** Split markdown content by section headings */
export function splitSections(content: string): Array<{
  heading: string
  level: number
  content: string
}> {
  const sections: Array<{ heading: string; level: number; content: string }> =
    []
  const lines = content.split('\n')

  let currentSection: { heading: string; level: number; lines: string[] } | null =
    null

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          heading: currentSection.heading,
          level: currentSection.level,
          content: currentSection.lines.join('\n').trim(),
        })
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lines: [],
      }
    } else if (currentSection) {
      currentSection.lines.push(line)
    }
  }

  // Save final section
  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      level: currentSection.level,
      content: currentSection.lines.join('\n').trim(),
    })
  }

  return sections
}
