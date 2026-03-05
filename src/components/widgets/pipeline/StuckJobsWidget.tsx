'use client'

import { useState, useEffect } from 'react'

interface PipelineJob {
  id: string
  job_id: string
  state: string
  company: string
  title: string
  error_message: string | null
  error_step: string | null
  llm_review_status: string
  updated_at: string
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

export function StuckJobsWidget() {
  const [jobs, setJobs] = useState<PipelineJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch both llm_pending and error state jobs
    Promise.all([
      fetch('/api/pipeline?view=jobs&state=llm_pending').then(r => r.json()),
      fetch('/api/pipeline?view=jobs&state=error').then(r => r.json()),
    ])
      .then(([pending, errored]) => {
        const all = [...(pending.data || []), ...(errored.data || [])]
        setJobs(all)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading...</div>
  if (error) return <div className="font-mono text-[11px] text-status-error">Error: {error}</div>
  if (!jobs || jobs.length === 0) {
    return (
      <div className="font-mono text-[11px] text-status-success flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-success" />
        All clear — no stuck or errored jobs
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {jobs.slice(0, 20).map(job => (
        <div
          key={job.id}
          className="flex items-center gap-2 px-1 py-1 rounded-sm font-mono text-[11px] hover:bg-terminal-bg-elevated/50 transition-colors"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
            job.state === 'error' ? 'bg-status-error' : 'bg-status-warning'
          }`} />
          <span className="text-user-accent shrink-0 w-16">{job.job_id}</span>
          <span className="text-terminal-fg-primary truncate flex-1">
            {job.company} — {job.title}
          </span>
          <span className={`text-[10px] shrink-0 ${
            job.state === 'error' ? 'text-status-error' : 'text-status-warning'
          }`}>
            {job.state === 'error' ? 'ERR' : 'PEND'}
          </span>
          <span className="text-terminal-fg-tertiary text-[10px] w-12 text-right">
            {formatRelative(job.updated_at)}
          </span>
        </div>
      ))}
      {jobs.length > 20 && (
        <div className="px-1 pt-1 font-mono text-[10px] text-terminal-fg-tertiary">
          +{jobs.length - 20} more
        </div>
      )}
    </div>
  )
}
