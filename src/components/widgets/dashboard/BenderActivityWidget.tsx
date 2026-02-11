'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BenderActivity {
  agent: string
  model: string
  status: 'active' | 'idle' | 'completed'
  started_at: string
  task_code: string | null
  task_title: string | null
}

export function BenderActivityWidget() {
  const [activities, setActivities] = useState<BenderActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/benders/activity')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message)
        } else {
          setActivities(json.data)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-xs text-terminal-fg-tertiary font-mono">
        Loading bender activity...
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

  if (activities.length === 0) {
    return (
      <div className="text-xs text-terminal-fg-tertiary font-mono">
        No recent bender activity
      </div>
    )
  }

  const getTimeElapsed = (startedAt: string) => {
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const elapsed = now - start
    const minutes = Math.floor(elapsed / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-500">active</span>
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1">
            <span className="text-terminal-fg-tertiary">✓</span>
            <span className="text-terminal-fg-tertiary">completed</span>
          </span>
        )
      case 'idle':
      default:
        return (
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">idle</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-2 text-xs font-mono">
      <div className="grid grid-cols-[1fr_auto_2fr_auto] gap-2 font-medium text-terminal-fg-tertiary">
        <div>AGENT</div>
        <div>STATUS</div>
        <div>TASK</div>
        <div>TIME</div>
      </div>
      <div className="space-y-1">
        {activities.slice(0, 10).map((activity, idx) => (
          <div
            key={idx}
            className={cn(
              'grid grid-cols-[1fr_auto_2fr_auto] gap-2 items-center py-1 border-b border-terminal-border',
              'hover:bg-terminal-bg-hover'
            )}
          >
            <div className="truncate text-terminal-fg-primary">
              {activity.agent}
            </div>
            <div>{getStatusBadge(activity.status)}</div>
            <div className="truncate text-terminal-fg-secondary">
              {activity.task_code && activity.task_title
                ? `${activity.task_code} — ${activity.task_title}`
                : activity.task_code || 'No task'}
            </div>
            <div className="text-terminal-fg-tertiary">
              {getTimeElapsed(activity.started_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
