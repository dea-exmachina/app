'use client'

import { StatusDot } from '@/components/ui/status-dot'
import { useProjectDashboardContext } from './ProjectDashboardProvider'

export function ProjectQuickStatsWidget() {
  const { data } = useProjectDashboardContext()

  const inProgress = data.cardsByLane['in_progress'] || 0

  return (
    <div className="flex items-center justify-between w-full h-full font-mono">
      <TickerStat label="TYPE" value={data.project.type || '—'} />
      <TickerDivider />
      <TickerStat label="OPEN" value={data.totalCards - (data.cardsByLane['done'] || 0)} />
      <TickerDivider />
      <TickerStat
        label="IN PROGRESS"
        value={inProgress}
        dot={inProgress > 0 ? 'warn' : undefined}
      />
      <TickerDivider />
      <TickerStat label="DONE" value={`${data.completionPct}%`} />
      <TickerDivider />
      <TickerStat label="BENDERS" value={data.benderCount} />
      <TickerDivider />
      <TickerStat
        label="ACTIVITY"
        value={data.lastCardActivity ? timeAgo(data.lastCardActivity) : '—'}
      />
    </div>
  )
}

function TickerStat({
  label,
  value,
  dot,
}: {
  label: string
  value: string | number
  dot?: 'ok' | 'warn' | 'error' | 'info'
}) {
  return (
    <div className="flex items-center gap-1.5 px-3">
      <span className="text-[10px] font-mono uppercase tracking-wider text-terminal-fg-tertiary">{label}</span>
      {dot && <StatusDot status={dot} size={5} />}
      <span className="text-xs font-mono font-semibold text-terminal-fg-primary">{value}</span>
    </div>
  )
}

function TickerDivider() {
  return <div className="w-px h-3.5 bg-terminal-border-strong shrink-0" />
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(diff / 86400000)
  return `${days}d`
}
