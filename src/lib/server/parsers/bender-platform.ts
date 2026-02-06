import type { BenderPlatform } from '@/types/bender'
import { splitSections } from './common'

/**
 * Parse benders/context/shared/platform-registry.md into platform definitions.
 */
export function parsePlatformRegistry(content: string): BenderPlatform[] {
  const platforms: BenderPlatform[] = []
  const sections = splitSections(content)

  for (const section of sections) {
    // Only parse level 2 headings as platforms
    if (section.level !== 2) continue

    const platform = parsePlatformSection(section.heading, section.content)
    if (platform) {
      platforms.push(platform)
    }
  }

  return platforms
}

/** Parse a single platform section */
function parsePlatformSection(
  name: string,
  content: string
): BenderPlatform | null {
  // Parse table rows
  const fields: Record<string, string> = {}

  const lines = content.split('\n')
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    if (line.includes('---') || line.includes('Field')) continue

    const parts = line
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length >= 2) {
      const [field, value] = parts
      fields[field] = value
    }
  }

  // Required fields check
  if (!fields.Status) return null

  // Generate slug from name
  const slug = name.toLowerCase().replace(/\s+/g, '-')

  // Parse status
  const status = (fields.Status.toLowerCase() === 'active'
    ? 'active'
    : fields.Status.toLowerCase() === 'planned'
      ? 'planned'
      : 'archived') as 'active' | 'planned' | 'archived'

  // Parse comma-separated arrays
  const models = fields.Models
    ? fields.Models.split(',').map((m) => m.trim()).filter(Boolean)
    : []

  const strengths = fields.Strengths
    ? fields.Strengths.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const limitations = fields.Limitations
    ? fields.Limitations.split(',').map((l) => l.trim()).filter(Boolean)
    : []

  // Parse cost tier
  const costTier = (fields['Cost Tier']?.toLowerCase() === 'cheap'
    ? 'cheap'
    : fields['Cost Tier']?.toLowerCase() === 'expensive'
      ? 'expensive'
      : 'TBD') as 'cheap' | 'expensive' | 'TBD'

  return {
    name,
    slug,
    status,
    interface: fields.Interface || '',
    models,
    costTier,
    strengths,
    limitations,
    configLocation: fields['Config Location'] || '',
    contextDirectory: fields['Context Directory'] || '',
  }
}
