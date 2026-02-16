'use client'

import type { AgentHealth } from '@/types/creep'

interface AgentRosterItemProps {
  agent: AgentHealth
  onClick?: () => void
}

const STATUS_DOT: Record<string, { dot: string; text: string }> = {
  active: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  idle: { dot: 'bg-amber-400', text: 'text-amber-400' },
  stuck: { dot: 'bg-red-400', text: 'text-red-400' },
  offline: { dot: 'bg-zinc-400', text: 'text-zinc-400' },
  unknown: { dot: 'bg-zinc-400', text: 'text-zinc-400' },
}

export function AgentRosterItem({ agent, onClick }: AgentRosterItemProps) {
  const colors = STATUS_DOT[agent.status] ?? STATUS_DOT.unknown
  const statusLabel = getStatusLabel(agent)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot} ${
            agent.status === 'active' ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-mono text-xs truncate">{agent.agent_name}</span>
      </div>
      <span className={`font-mono text-[10px] shrink-0 ${colors.text}`}>
        {statusLabel}
      </span>
    </button>
  )
}

function getStatusLabel(agent: AgentHealth): string {
  if (agent.status === 'active') return 'active'
  if (agent.status === 'stuck') return 'stuck!'
  if (agent.status === 'offline') return 'offline'
  if (agent.status === 'idle') {
    const idleTime = getIdleTime(agent.last_activity_at)
    return `idle ${idleTime}`
  }
  return agent.status
}

function getIdleTime(lastActivityAt: string): string {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
