'use client'

import { useEffect, useState } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'
import { StatusDot, statusToType } from '@/components/ui/status-dot'

interface SessionEntry {
  id: string
  agent: string
  model: string | null
  cardId: string | null
  status: 'active' | 'idle' | 'completed'
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffM < 1) return 'just now'
  if (diffM < 60) return `${diffM}m ago`
  if (diffH < 24) return `${diffH}h ago`
  return `${diffD}d ago`
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function SessionArchive() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    fetch('/api/sessions?limit=10')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setSessions(json.data.sessions)
          setActiveCount(json.data.activeCount)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <SectionDivider label="Sessions" />
        <div className="font-mono text-[11px] text-terminal-fg-tertiary py-2">Loading...</div>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div>
        <SectionDivider label="Sessions" />
        <div className="font-mono text-[11px] text-terminal-fg-tertiary py-2">No sessions recorded</div>
      </div>
    )
  }

  return (
    <div>
      <SectionDivider
        label="Sessions"
        count={activeCount > 0 ? `${activeCount} active` : undefined}
      />
      <div className="mt-1 space-y-0.5">
        {sessions.map(session => (
          <div
            key={session.id}
            className="flex items-center gap-2 font-mono text-[11px] px-1 py-0.5"
          >
            <StatusDot status={statusToType(session.status)} size={5} />
            <span className="text-terminal-fg-primary shrink-0 w-[70px] truncate">
              {session.agent}
            </span>
            {session.model && (
              <span className="text-terminal-fg-tertiary shrink-0 text-[10px]">
                {session.model}
              </span>
            )}
            {session.cardId && (
              <span className="text-user-accent shrink-0 text-[10px]">
                {session.cardId}
              </span>
            )}
            <span className="flex-1" />
            <span className="text-terminal-fg-tertiary text-[10px] shrink-0">
              {formatDuration(session.durationMinutes)}
            </span>
            <span className="text-terminal-fg-tertiary text-[10px] shrink-0">
              {relativeTime(session.startedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
