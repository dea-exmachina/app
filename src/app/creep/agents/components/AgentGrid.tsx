'use client'

import { useState, useCallback } from 'react'
import type { AgentHealth, AgentStatus } from '@/types/creep'
import { useAgentHealth } from '@/hooks/useAgentHealth'
import { AgentCard } from './AgentCard'
import { AgentDetail } from './AgentDetail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Users, AlertTriangle } from 'lucide-react'

const STATUS_FILTERS: AgentStatus[] = ['active', 'idle', 'stuck', 'offline']

export function AgentGrid() {
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus | ''>('')
  const [selectedAgent, setSelectedAgent] = useState<AgentHealth | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const {
    agents,
    stuckAgents,
    loading,
    error,
    refresh,
    lastUpdated,
  } = useAgentHealth({ pollInterval: 10000 })

  const handleSelect = useCallback((agent: AgentHealth) => {
    setSelectedAgent(agent)
    setDetailOpen(true)
  }, [])

  // Filter agents by selected status
  const filteredAgents = selectedStatus
    ? agents.filter((a) => a.status === selectedStatus)
    : agents

  return (
    <div className="space-y-4">
      {/* Stuck alert bar */}
      {stuckAgents.length > 0 && (
        <StuckAlert agents={stuckAgents} onSelect={handleSelect} />
      )}

      {/* Filters + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">Status:</span>
        <Button
          variant={selectedStatus === '' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setSelectedStatus('')}
          className="font-mono"
        >
          All ({agents.length})
        </Button>
        {STATUS_FILTERS.map((status) => {
          const count = agents.filter((a) => a.status === status).length
          return (
            <Button
              key={status}
              variant={selectedStatus === status ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setSelectedStatus(selectedStatus === status ? '' : status)}
              className="font-mono"
            >
              {status} ({count})
            </Button>
          )
        })}

        {/* Spacer + refresh */}
        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={refresh}
            disabled={loading}
            title="Refresh agents"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content area */}
      {loading && agents.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : agents.length === 0 ? (
        <EmptyState />
      ) : filteredAgents.length === 0 ? (
        <EmptyFilterState status={selectedStatus} onClear={() => setSelectedStatus('')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <AgentDetail
        agent={selectedAgent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}

/**
 * Prominent alert bar for stuck agents.
 */
function StuckAlert({
  agents,
  onSelect,
}: {
  agents: AgentHealth[]
  onSelect: (agent: AgentHealth) => void
}) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="font-mono text-xs font-semibold text-red-400">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} stuck
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => {
          const stuckFor = getStuckDuration(agent.last_activity_at)
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent)}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              {agent.agent_name}
              <span className="text-red-400/60">({stuckFor})</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm font-medium mb-1">Failed to load agents</p>
      <p className="text-xs text-muted-foreground mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="font-mono text-xs text-primary hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <Users className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">No agents registered</p>
      <p className="text-xs text-muted-foreground">
        Agents will appear here once they send their first heartbeat to CREEP.
      </p>
    </div>
  )
}

function EmptyFilterState({
  status,
  onClear,
}: {
  status: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <Users className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">No {status} agents</p>
      <p className="text-xs text-muted-foreground mb-3">
        No agents currently have the &quot;{status}&quot; status.
      </p>
      <button
        onClick={onClear}
        className="font-mono text-xs text-primary hover:underline"
      >
        Show all agents
      </button>
    </div>
  )
}

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  return `${diffMin}m ago`
}

function getStuckDuration(lastActivityAt: string): string {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
