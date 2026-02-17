'use client'

import type { AgentHealth } from '@/types/creep'
import { StatusBadge } from './StatusBadge'
import { Badge } from '@/components/ui/badge'

interface AgentCardProps {
  agent: AgentHealth
  onSelect: (agent: AgentHealth) => void
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const activityAge = getActivityAge(agent.last_activity_at)
  const sessionDuration = getSessionDuration(agent.metrics.session_start)
  const isStale = activityAge.seconds > 300 // 5 minutes

  return (
    <button
      onClick={() => onSelect(agent)}
      className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent/30 focus:outline-none focus:bg-accent/40 ${
        agent.status === 'stuck'
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-border'
      }`}
    >
      {/* Header: name + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{agent.agent_name}</span>
          <Badge variant="outline" className="font-mono text-xs shrink-0">
            {agent.platform}
          </Badge>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Current task */}
      {agent.current_task && (
        <p className="text-xs text-muted-foreground truncate mb-2">
          <span className="font-mono text-muted-foreground/60">task:</span>{' '}
          {agent.current_task}
        </p>
      )}

      {/* Footer: activity + session */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <HeartbeatDot stale={isStale} status={agent.status} />
          <span className="font-mono text-xs text-muted-foreground">
            {activityAge.label}
          </span>
        </div>
        {sessionDuration && (
          <span className="font-mono text-xs text-muted-foreground">
            session: {sessionDuration}
          </span>
        )}
      </div>
    </button>
  )
}

/**
 * Heartbeat visual indicator — pulses when recent, dims when stale.
 */
function HeartbeatDot({ stale, status }: { stale: boolean; status: string }) {
  if (status === 'offline' || status === 'unknown') {
    return <span className="inline-block h-2 w-2 rounded-full bg-zinc-500/40" />
  }

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full transition-opacity ${
        stale
          ? 'bg-amber-400/40'
          : 'bg-emerald-400 animate-pulse'
      }`}
    />
  )
}

/**
 * Compute human-readable time since last activity.
 */
function getActivityAge(lastActivityAt: string): { label: string; seconds: number } {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime()
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return { label: 'active just now', seconds }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { label: `active ${minutes}m ago`, seconds }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { label: `active ${hours}h ago`, seconds }
  const days = Math.floor(hours / 24)
  return { label: `active ${days}d ago`, seconds }
}

/**
 * Compute session duration from session_start metric.
 */
function getSessionDuration(sessionStart: string | undefined): string | null {
  if (!sessionStart) return null

  const diffMs = Date.now() - new Date(sessionStart).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
