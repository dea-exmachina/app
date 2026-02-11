'use client'

import { useProjectDashboardContext } from './ProjectDashboardProvider'

const LANES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const
const LANE_LABELS: Record<string, string> = {
  backlog: 'BACKLOG',
  ready: 'READY',
  in_progress: 'IN PROGRESS',
  review: 'REVIEW',
  done: 'DONE',
}
const LANE_COLORS: Record<string, string> = {
  backlog: 'bg-terminal-fg-tertiary',
  ready: 'bg-status-info',
  in_progress: 'bg-status-warn',
  review: 'bg-user-accent',
  done: 'bg-status-ok',
}

export function ProjectKanbanSummaryWidget() {
  const { data } = useProjectDashboardContext()

  if (!data.nexusProject) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        No kanban board linked
      </div>
    )
  }

  const maxCount = Math.max(...LANES.map((l) => data.cardsByLane[l] || 0), 1)

  return (
    <div className="space-y-3 h-full overflow-auto">
      {/* Overall progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="terminal-label">COMPLETION</span>
          <span className="font-mono text-xs text-terminal-fg-primary">
            {data.completionPct}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-terminal-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-status-ok transition-all"
            style={{ width: `${data.completionPct}%` }}
          />
        </div>
      </div>

      {/* Lane breakdown */}
      <div className="space-y-2">
        {LANES.map((lane) => {
          const count = data.cardsByLane[lane] || 0
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
          return (
            <div key={lane} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="terminal-label">{LANE_LABELS[lane]}</span>
                <span className="font-mono text-xs text-terminal-fg-primary">
                  {count}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-terminal-bg-elevated overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${LANE_COLORS[lane]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-terminal-border">
        <span className="terminal-label">TOTAL</span>
        <span className="font-mono text-xs text-terminal-fg-primary">
          {data.totalCards}
        </span>
      </div>
    </div>
  )
}
