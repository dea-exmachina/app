'use client'

import Link from 'next/link'
import { useAgentHealth } from '@/hooks/useAgentHealth'

export function SystemPulse() {
  const { agents, stuckAgents, loading } = useAgentHealth({ pollInterval: 30000 })

  const idleAgents = agents.filter((a) => a.status === 'idle')
  const stuckCount = stuckAgents.length
  const idleCount = idleAgents.length

  // Determine status
  let status: 'ok' | 'idle' | 'stuck' = 'ok'
  let label = 'All clear'
  let dotColor = 'bg-emerald-400'

  if (stuckCount > 0) {
    status = 'stuck'
    label = `${stuckCount} stuck`
    dotColor = 'bg-red-400'
  } else if (idleCount > 0) {
    status = 'idle'
    label = `${idleCount} idle`
    dotColor = 'bg-amber-400'
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
        <span className="inline-block h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
        <span className="font-mono text-xs text-muted-foreground">...</span>
      </div>
    )
  }

  return (
    <Link
      href="/queen/agents"
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-accent/50 ${
        status === 'stuck' ? 'bg-red-500/10' : ''
      }`}
      title={`${agents.length} agents total`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotColor} ${
          status === 'ok' ? 'animate-pulse' : ''
        }`}
      />
      <span
        className={`font-mono text-xs ${
          status === 'stuck'
            ? 'text-red-400'
            : status === 'idle'
            ? 'text-amber-400'
            : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </Link>
  )
}
