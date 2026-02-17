'use client'

import { useState, useEffect } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'

interface ReopenStats {
  totalReopens: number
  uniqueCards: number
  reopenRate: number
  recentReopens: Array<{
    id: string
    cardId: string
    reopenedFrom: string
    reopenedTo: string
    reason: string | null
    createdAt: string
  }>
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function ReopenRateWidget() {
  const [stats, setStats] = useState<ReopenStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nexus/stats/reopens?limit=10')
      .then((r) => r.json())
      .then((json) => setStats(json.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary p-2">Loading...</div>
    )
  }

  if (!stats) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary p-2">
        Failed to load stats
      </div>
    )
  }

  const rateColor =
    stats.reopenRate > 15
      ? 'text-status-error'
      : stats.reopenRate > 5
        ? 'text-status-warn'
        : 'text-status-ok'

  return (
    <div className="flex h-full flex-col gap-1">
      <SectionDivider label="Reopen Rate" count={`${stats.reopenRate}%`} />

      {/* Summary stats */}
      <div className="flex items-center gap-4 font-mono text-[11px] px-1">
        <div>
          <span className="text-terminal-fg-tertiary">rate </span>
          <span className={`font-bold ${rateColor}`}>{stats.reopenRate}%</span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary">reopens </span>
          <span className="text-terminal-fg-primary">{stats.totalReopens}</span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary">cards </span>
          <span className="text-terminal-fg-primary">{stats.uniqueCards}</span>
        </div>
      </div>

      {/* Recent reopens */}
      {stats.recentReopens.length === 0 ? (
        <div className="py-3 text-center font-mono text-[11px] text-terminal-fg-tertiary">
          No reopens recorded.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {stats.recentReopens.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 py-0.5 px-1 font-mono text-[11px] hover:bg-terminal-bg-elevated/50 rounded-sm"
            >
              <span className="text-user-accent shrink-0">{r.cardId}</span>
              <span className="text-terminal-fg-tertiary text-[9px] shrink-0">
                {r.reopenedFrom} → {r.reopenedTo}
              </span>
              {r.reason && (
                <span className="text-terminal-fg-secondary truncate flex-1">
                  {r.reason}
                </span>
              )}
              <span className="text-terminal-fg-tertiary shrink-0 text-right w-8">
                {timeAgo(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
