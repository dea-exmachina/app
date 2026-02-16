'use client'

import { Badge } from '@/components/ui/badge'

/**
 * Color map for event type categories.
 * Each category gets a distinct hue for quick visual scanning.
 */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  agent: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  task: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  file: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  git: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  message: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  webhook: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  sync: { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' },
  pipeline: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
}

const DEFAULT_COLORS = { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' }

interface EventTypeBadgeProps {
  type: string
}

export function EventTypeBadge({ type }: EventTypeBadgeProps) {
  const category = type.split('.')[0]
  const colors = CATEGORY_COLORS[category] ?? DEFAULT_COLORS

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {type}
    </Badge>
  )
}

/** Returns the category name from a dot-notation event type */
export function getEventCategory(type: string): string {
  return type.split('.')[0]
}

/** All known event categories for filter UI */
export const EVENT_CATEGORIES = [
  'agent',
  'task',
  'file',
  'git',
  'message',
  'webhook',
  'sync',
  'pipeline',
] as const

export { CATEGORY_COLORS }
