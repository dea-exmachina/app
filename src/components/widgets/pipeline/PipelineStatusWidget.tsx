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
  error_step: string | null
}

interface SummaryData {
  latestRun: PipelineRun | null
  stateCounts: Record<string, number>
  totalJobs: number
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'text-status-warning bg-status-warning/10',
    completed: 'text-status-success bg-status-success/10',
    failed: 'text-status-error bg-status-error/10',
    partial: 'text-status-warning bg-status-warning/10',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${colors[status] || 'text-terminal-fg-tertiary bg-terminal-bg-elevated'}`}>
      {status}
    </span>
  )
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'in progress'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  return `${mins}m ${secs % 60}s`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PipelineStatusWidget() {
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

  if (loading) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading pipeline status...</div>
  if (error) return <div className="font-mono text-[11px] text-status-error">Error: {error}</div>
  if (!data) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">No pipeline data</div>

  const run = data.latestRun

  return (
    <div className="space-y-3">
      {run ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={run.status} />
              <span className="font-mono text-[10px] text-terminal-fg-tertiary">
                {run.trigger}
              </span>
            </div>
            <span className="font-mono text-[10px] text-terminal-fg-tertiary">
              {formatTime(run.started_at)}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <Stat label="Discovered" value={run.jobs_discovered} />
            <Stat label="Scored" value={run.jobs_scored} />
            <Stat label="LLM" value={run.jobs_llm_analyzed} />
            <Stat label="Skipped" value={run.jobs_skipped} />
            <Stat label="Errors" value={run.jobs_errored} accent={run.jobs_errored > 0 ? 'error' : undefined} />
          </div>

          <div className="font-mono text-[10px] text-terminal-fg-tertiary">
            Duration: {formatDuration(run.started_at, run.completed_at)}
          </div>

          {run.error_message && (
            <div className="font-mono text-[10px] text-status-error bg-status-error/5 px-2 py-1 rounded">
              {run.error_step && <span className="text-terminal-fg-secondary">[{run.error_step}] </span>}
              {run.error_message}
            </div>
          )}
        </>
      ) : (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">No pipeline runs yet</div>
      )}

      <div className="border-t border-terminal-border pt-2">
        <div className="font-mono text-[10px] text-terminal-fg-secondary uppercase tracking-wider mb-1">
          Total Jobs: {data.totalJobs}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'error' }) {
  return (
    <div className="text-center">
      <div className={`font-mono text-sm font-bold ${accent === 'error' ? 'text-status-error' : 'text-user-accent'}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] text-terminal-fg-tertiary uppercase">{label}</div>
    </div>
  )
}
