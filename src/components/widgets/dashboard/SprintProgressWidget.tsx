'use client'

import { useState, useEffect } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'

interface SprintProgressData {
  total: number
  done: number
  percent: number
  date_from: string
  date_to: string
}

function formatDateRange(from: string, to: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [fy, fm, fd] = from.split('-').map(Number)
  const [, tm, td] = to.split('-').map(Number)
  const fromStr = `${months[fm - 1]} ${fd}`
  const toStr = fm === tm ? `${td}` : `${months[tm - 1]} ${td}`
  return `${fromStr} – ${toStr} ${fy}`
}

function barColor(percent: number): string {
  if (percent >= 70) return 'bg-status-ok'
  if (percent >= 40) return 'bg-status-warn'
  return 'bg-status-error'
}

export function SprintProgressWidget() {
  const [data, setData] = useState<SprintProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/kanban/sprint-progress')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message ?? 'Failed to load sprint progress')
        } else {
          setData(json as SprintProgressData)
        }
      })
      .catch(() => setError('Network error — could not load sprint progress'))
      .finally(() => setLoading(false))
  }, [])

  const dateLabel = data
    ? formatDateRange(data.date_from, data.date_to)
    : 'This week'

  return (
    <div className="flex h-full flex-col gap-1">
      <SectionDivider label="Sprint Progress" count={dateLabel} />

      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary p-2">Loading...</div>
      ) : error ? (
        <div className="font-mono text-[10px] text-status-error p-2">{error}</div>
      ) : data ? (
        <div className="flex flex-col gap-3 p-1 pt-2">
          {/* Progress bar */}
          <div className="flex flex-col gap-1">
            <div className="h-4 w-full rounded-sm bg-terminal-bg-elevated border border-terminal-border overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${barColor(data.percent)}`}
                style={{ width: `${Math.min(data.percent, 100)}%` }}
              />
            </div>

            {/* Percentage label */}
            <div className="flex items-center justify-between">
              <span className={`font-mono text-[13px] font-bold ${barColor(data.percent).replace('bg-', 'text-')}`}>
                {data.percent.toFixed(1)}%
              </span>
              <span className="font-mono text-[10px] text-terminal-fg-tertiary">
                {data.done} / {data.total} cards done
              </span>
            </div>
          </div>

          {/* Zero state */}
          {data.total === 0 && (
            <div className="font-mono text-[10px] text-terminal-fg-tertiary">
              No cards created this week.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
