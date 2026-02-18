'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeDate } from '@/lib/client/formatters'

interface AuditLogEntry {
  id: string
  event_id: string
  action: string
  category: string
  actor: string
  card_id: string | null
  entity_type: string
  created_at: string
  metadata: Record<string, unknown>
}

const CATEGORY_COLORS: Record<string, string> = {
  card: 'text-status-info border-status-info',
  bender: 'text-status-success border-status-success',
  system: 'text-terminal-fg-secondary border-terminal-border',
  sprint: 'text-[#a78bfa] border-[#a78bfa]',
}

function categoryBadgeClass(category: string): string {
  return CATEGORY_COLORS[category] ?? 'text-terminal-fg-tertiary border-terminal-border'
}

function formatActor(actor: string): string {
  if (actor === 'system') return 'sys'
  if (actor === 'dea') return 'dea'
  // bender+atlas → bender:atlas
  if (actor.startsWith('bender+')) return actor.replace('bender+', 'bender:')
  return actor
}

function formatDescription(entry: AuditLogEntry): string {
  // Prefer a human-readable description from metadata, fall back to action
  const meta = entry.metadata
  if (meta && typeof meta.description === 'string') return meta.description
  if (entry.action) return entry.action
  return entry.event_id
}

const POLL_INTERVAL_MS = 30_000

export function ActivityFeedWidget() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(() => {
    fetch('/api/activity?limit=30')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        setEntries(json.data ?? [])
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchActivity])

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading activity...
      </div>
    )
  }

  if (error) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load activity: {error}
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        No activity
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full space-y-0.5">
      {entries.map((entry) => {
        const catClass = categoryBadgeClass(entry.category)
        return (
          <div
            key={entry.id}
            className="flex items-start gap-2 py-1 px-1 rounded-sm hover:bg-terminal-bg-surface transition-colors"
          >
            {/* Time */}
            <span className="font-mono text-[10px] text-terminal-fg-tertiary shrink-0 w-14 pt-px text-right">
              {formatRelativeDate(entry.created_at)}
            </span>

            {/* Category badge */}
            <span
              className={`font-mono text-[9px] border rounded-sm px-1 shrink-0 leading-4 uppercase tracking-wide ${catClass}`}
            >
              {entry.category}
            </span>

            {/* Actor */}
            <span className="font-mono text-[10px] text-user-accent shrink-0">
              {formatActor(entry.actor)}
            </span>

            {/* Description + optional card link */}
            <span className="font-mono text-[11px] text-terminal-fg-primary truncate flex-1 min-w-0">
              {formatDescription(entry)}
              {entry.card_id && (
                <span className="ml-1 text-terminal-fg-tertiary text-[10px]">
                  #{entry.card_id}
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
