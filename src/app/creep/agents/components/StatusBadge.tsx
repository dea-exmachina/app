'use client'

import { Badge } from '@/components/ui/badge'
import type { AgentStatus } from '@/types/creep'

/**
 * Color map for agent status values.
 * active=emerald, idle=amber, stuck=red, offline=zinc/gray, unknown=gray
 */
const STATUS_COLORS: Record<AgentStatus, { bg: string; text: string; border: string; dot: string }> = {
  active: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  idle: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  stuck: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
  },
  offline: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    dot: 'bg-zinc-400',
  },
  unknown: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    dot: 'bg-zinc-400',
  },
}

interface StatusBadgeProps {
  status: AgentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status]

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${colors.bg} ${colors.text} ${colors.border} gap-1.5`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot} ${status === 'active' ? 'animate-pulse' : ''}`}
      />
      {status}
    </Badge>
  )
}

export { STATUS_COLORS }
