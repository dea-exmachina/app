'use client'

import { useState, useEffect } from 'react'

interface PipelineRun {
  id: string
  status: string
  trigger: string
  started_at: string
  completed_at: string | null
  jobs_discovered: number
  jobs_scored: number
  jobs_llm_analyzed: number
  jobs_skipped: number
  jobs_errored: number
  error_message: string | null
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'bg-status-warning',
    completed: 'bg-status-success',
    failed: 'bg-status-error',
    partial: 'bg-status-warning',
  }
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colors[status] || 'bg-terminal-fg-tertiary'}`} />
  )
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function RecentRunsWidget() {
  const [runs, setRuns] = useState<PipelineRun[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pipeline?view=runs')
      .then(r => r.json())
      .then(res => {
        if (res.error) throw new Error(res.error.message)
        setRuns(res.data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading runs...</div>
  if (error) return <div className="font-mono text-[11px] text-status-error">Error: {error}</div>
  if (!runs || runs.length === 0) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">No runs yet</div>

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 px-1 py-0.5 font-mono text-[9px] text-terminal-fg-tertiary uppercase tracking-wider border-b border-terminal-border">
        <span className="w-3" />
        <span className="w-14">When</span>
        <span className="w-12">Trigger</span>
        <span className="flex-1">Jobs</span>
        <span className="w-10 text-right">Errors</span>
      </div>
      {runs.map(run => (
        <div
          key={run.id}
          className="flex items-center gap-2 px-1 py-1 rounded-sm font-mono text-[11px] hover:bg-terminal-bg-elevated/50 transition-colors"
        >
          <StatusDot status={run.status} />
          <span className="w-14 text-terminal-fg-tertiary text-[10px]">
            {formatRelative(run.started_at)}
          </span>
          <span className="w-12 text-terminal-fg-secondary text-[10px]">
            {run.trigger}
          </span>
          <span className="flex-1 text-terminal-fg-primary text-[10px]">
            {run.jobs_discovered}d / {run.jobs_scored}s / {run.jobs_llm_analyzed}llm
          </span>
          <span className={`w-10 text-right text-[10px] ${run.jobs_errored > 0 ? 'text-status-error' : 'text-terminal-fg-tertiary'}`}>
            {run.jobs_errored > 0 ? run.jobs_errored : '-'}
          </span>
        </div>
      ))}
    </div>
  )
}
