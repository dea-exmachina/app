'use client'

import { useState, useEffect } from 'react'

interface SummaryData {
  stateCounts: Record<string, number>
  totalJobs: number
}

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  discovered: { label: 'Discovered', color: 'text-terminal-fg-secondary' },
  heuristic_scored: { label: 'Scored', color: 'text-user-accent' },
  skipped: { label: 'Skipped', color: 'text-terminal-fg-tertiary' },
  llm_pending: { label: 'LLM Pending', color: 'text-status-warning' },
  llm_analyzed: { label: 'LLM Analyzed', color: 'text-status-success' },
  sheet_synced: { label: 'Sheet Synced', color: 'text-status-success' },
  archived: { label: 'Archived', color: 'text-terminal-fg-tertiary' },
  error: { label: 'Error', color: 'text-status-error' },
}

const STATE_ORDER = [
  'discovered', 'heuristic_scored', 'llm_pending', 'llm_analyzed',
  'sheet_synced', 'skipped', 'archived', 'error',
]

export function PipelineJobsWidget() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pipeline?view=summary')
      .then(r => r.json())
      .then(res => {
        if (res.error) throw new Error(res.error.message)
        setData(res.data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading...</div>
  if (error) return <div className="font-mono text-[11px] text-status-error">Error: {error}</div>
  if (!data) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">No data</div>

  const counts = data.stateCounts
  const total = data.totalJobs || 1

  return (
    <div className="space-y-1.5">
      {STATE_ORDER.map(state => {
        const count = counts[state] || 0
        if (count === 0) return null
        const config = STATE_CONFIG[state] || { label: state, color: 'text-terminal-fg-primary' }
        const pct = Math.round((count / total) * 100)

        return (
          <div key={state} className="flex items-center gap-2">
            <span className={`font-mono text-[10px] w-24 shrink-0 ${config.color}`}>
              {config.label}
            </span>
            <div className="flex-1 h-2 bg-terminal-bg-elevated rounded-sm overflow-hidden">
              <div
                className={`h-full rounded-sm transition-all ${
                  state === 'error' ? 'bg-status-error/60' :
                  state === 'llm_pending' ? 'bg-status-warning/60' :
                  state === 'skipped' || state === 'archived' ? 'bg-terminal-fg-tertiary/30' :
                  'bg-user-accent/60'
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-terminal-fg-tertiary w-10 text-right">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
