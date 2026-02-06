'use client'

import { Badge } from '@/components/ui/badge'
import type { MaturityLevel } from '../types'

const MATURITY_COLORS: Record<MaturityLevel, { bg: string; text: string; border: string }> = {
  bronze: {
    bg: 'bg-amber-600/15',
    text: 'text-amber-500',
    border: 'border-amber-600/30',
  },
  silver: {
    bg: 'bg-zinc-400/15',
    text: 'text-zinc-300',
    border: 'border-zinc-400/30',
  },
  gold: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
}

const MATURITY_LABELS: Record<MaturityLevel, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
}

interface MaturityBadgeProps {
  maturity: MaturityLevel
}

export function MaturityBadge({ maturity }: MaturityBadgeProps) {
  const colors = MATURITY_COLORS[maturity]

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${colors.bg} ${colors.text} ${colors.border} gap-1.5`}
    >
      <MaturityIcon maturity={maturity} />
      {MATURITY_LABELS[maturity]}
    </Badge>
  )
}

function MaturityIcon({ maturity }: { maturity: MaturityLevel }) {
  const size = 'h-2.5 w-2.5'

  if (maturity === 'gold') {
    return (
      <svg className={size} viewBox="0 0 10 10" fill="currentColor">
        <polygon points="5,0 6.5,3 10,3.5 7.5,6 8,10 5,8 2,10 2.5,6 0,3.5 3.5,3" />
      </svg>
    )
  }

  if (maturity === 'silver') {
    return (
      <svg className={size} viewBox="0 0 10 10" fill="currentColor">
        <circle cx="5" cy="5" r="4" />
      </svg>
    )
  }

  // bronze: triangle
  return (
    <svg className={size} viewBox="0 0 10 10" fill="currentColor">
      <polygon points="5,1 9,9 1,9" />
    </svg>
  )
}

export { MATURITY_COLORS }
