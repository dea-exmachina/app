'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DelegationStats {
  overall: {
    bender: number
    dea: number
    ratio: string
  }
  byProject: Array<{
    project: string
    bender: number
    dea: number
  }>
}

export function DelegationRatioWidget() {
  const [stats, setStats] = useState<DelegationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/nexus/delegation-stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message)
        } else {
          setStats(json.data)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-xs text-terminal-fg-tertiary font-mono">
        Loading delegation stats...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-destructive font-mono">
        Failed to load: {error}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-xs text-terminal-fg-tertiary font-mono">
        No delegation data available
      </div>
    )
  }

  const { overall, byProject } = stats
  const total = overall.bender + overall.dea
  const benderPercent = total > 0 ? (overall.bender / total) * 100 : 0

  // Color based on delegation ratio
  const getRatioColor = (percent: number) => {
    if (percent >= 70) return 'text-green-500'
    if (percent >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Large ratio display */}
      <div className="text-center space-y-2">
        <div
          className={cn(
            'text-4xl font-bold',
            getRatioColor(benderPercent)
          )}
        >
          {overall.ratio} BENDER
        </div>
        <div className="text-terminal-fg-tertiary">
          {overall.bender} bender / {overall.dea} dea ({total} total)
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-terminal-border rounded-full overflow-hidden">
        <div
          className="h-full bg-terminal-accent"
          style={{ width: overall.ratio }}
        />
      </div>

      {/* Per-project breakdown */}
      {byProject.length > 0 && (
        <div className="space-y-1">
          <div className="text-terminal-fg-tertiary font-medium mb-2">
            BY PROJECT
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {byProject.map((proj, idx) => {
              const projTotal = proj.bender + proj.dea
              const projPercent = projTotal > 0 ? (proj.bender / projTotal) * 100 : 0
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 border-b border-terminal-border hover:bg-terminal-bg-hover"
                >
                  <div className="truncate flex-1 text-terminal-fg-secondary">
                    {proj.project}
                  </div>
                  <div className="flex items-center gap-2 text-terminal-fg-tertiary">
                    <span>{Math.round(projPercent)}%</span>
                    <span className="text-[10px]">
                      {proj.bender}B/{proj.dea}D
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
