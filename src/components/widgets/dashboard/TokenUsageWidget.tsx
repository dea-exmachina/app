'use client'

import { useState, useEffect } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'

interface TokenStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCostUsd: number
  byModel: Array<{
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    count: number
  }>
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

export function TokenUsageWidget() {
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nexus/stats/tokens?days=30')
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
        Failed to load token stats
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-1">
      <SectionDivider
        label="Token Usage (30d)"
        count={`$${stats.totalCostUsd.toFixed(2)}`}
      />

      {/* Summary */}
      <div className="flex items-center gap-4 font-mono text-[11px] px-1">
        <div>
          <span className="text-terminal-fg-tertiary">total </span>
          <span className="text-terminal-fg-primary font-bold">
            {formatTokens(stats.totalTokens)}
          </span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary">in </span>
          <span className="text-blue-400">{formatTokens(stats.totalInputTokens)}</span>
        </div>
        <div>
          <span className="text-terminal-fg-tertiary">out </span>
          <span className="text-green-400">{formatTokens(stats.totalOutputTokens)}</span>
        </div>
      </div>

      {/* By model */}
      {stats.byModel.length === 0 ? (
        <div className="py-3 text-center font-mono text-[11px] text-terminal-fg-tertiary">
          No token usage recorded yet.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {stats.byModel.map((m) => {
            const pct = stats.totalTokens > 0 ? (m.totalTokens / stats.totalTokens) * 100 : 0
            return (
              <div
                key={m.model}
                className="flex items-center gap-2 py-1 px-1 font-mono text-[11px] hover:bg-terminal-bg-elevated/50 rounded-sm"
              >
                <span className="text-terminal-fg-primary w-32 truncate shrink-0">
                  {m.model}
                </span>
                <div className="flex-1 h-1.5 bg-terminal-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-user-accent rounded-full"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-terminal-fg-secondary w-12 text-right shrink-0">
                  {formatTokens(m.totalTokens)}
                </span>
                <span className="text-terminal-fg-tertiary w-14 text-right shrink-0">
                  ${m.costUsd.toFixed(4)}
                </span>
                <span className="text-terminal-fg-tertiary w-8 text-right shrink-0">
                  {m.count}x
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
