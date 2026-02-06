'use client'

import { Badge } from '@/components/ui/badge'
import type { Severity } from '../types'
import { SEVERITY_POINTS } from '../types'

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  critical: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  major: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  moderate: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  minor: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
}

interface SeverityBadgeProps {
  severity: Severity
  showPoints?: boolean
}

export function SeverityBadge({ severity, showPoints = false }: SeverityBadgeProps) {
  const colors = SEVERITY_COLORS[severity]

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {severity}
      {showPoints && (
        <span className="ml-1 opacity-70">-{SEVERITY_POINTS[severity]}</span>
      )}
    </Badge>
  )
}

export { SEVERITY_COLORS }
