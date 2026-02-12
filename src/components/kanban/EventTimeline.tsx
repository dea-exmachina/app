'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  ArrowRight,
  UserCheck,
  CheckCircle,
  Bot,
  MessageSquare,
  RotateCcw,
  Lock,
  Unlock,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { getCardEvents } from '@/lib/client/api'
import type { NexusEvent, NexusEventType } from '@/types/nexus'

// ── Event icon mapping ─────────────────────────────────

const EVENT_ICONS: Record<NexusEventType, React.ComponentType<{ className?: string }>> = {
  'card.created': Plus,
  'card.moved': ArrowRight,
  'card.assigned': UserCheck,
  'card.completed': CheckCircle,
  'card.bender_moved': Bot,
  'comment.added': MessageSquare,
  'comment.pivot': RotateCcw,
  'lock.acquired': Lock,
  'lock.released': Unlock,
  'scope.conflict': AlertTriangle,
  'context.stale': Activity,
  'session.started': Activity,
  'session.ended': Activity,
}

const EVENT_COLORS: Record<NexusEventType, string> = {
  'card.created': 'text-status-ok',
  'card.moved': 'text-user-accent',
  'card.assigned': 'text-terminal-fg-primary',
  'card.completed': 'text-status-ok',
  'card.bender_moved': 'text-terminal-fg-secondary',
  'comment.added': 'text-terminal-fg-secondary',
  'comment.pivot': 'text-status-warn',
  'lock.acquired': 'text-terminal-fg-tertiary',
  'lock.released': 'text-terminal-fg-tertiary',
  'scope.conflict': 'text-status-error',
  'context.stale': 'text-status-warn',
  'session.started': 'text-terminal-fg-tertiary',
  'session.ended': 'text-terminal-fg-tertiary',
}

// ── Actor colors ───────────────────────────────────────

function actorColor(actor: string): string {
  if (actor === 'user') return 'text-blue-400'
  if (actor === 'dea') return 'text-purple-400'
  if (actor === 'webapp') return 'text-green-400'
  if (actor === 'council') return 'text-red-400'
  if (actor.startsWith('bender')) return 'text-amber-400'
  return 'text-terminal-fg-tertiary'
}

function actorBadge(actor: string): string {
  if (actor === 'user') return 'bg-blue-400/10 border-blue-400/30'
  if (actor === 'dea') return 'bg-purple-400/10 border-purple-400/30'
  if (actor === 'webapp') return 'bg-green-400/10 border-green-400/30'
  if (actor === 'council') return 'bg-red-400/10 border-red-400/30'
  if (actor.startsWith('bender')) return 'bg-amber-400/10 border-amber-400/30'
  return 'bg-terminal-bg-elevated border-terminal-border'
}

// ── Relative time helper ───────────────────────────────

function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const diffMs = Date.now() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)
    if (diffM < 1) return 'just now'
    if (diffM < 60) return `${diffM}m ago`
    if (diffH < 24) return `${diffH}h ago`
    return `${diffD}d ago`
  } catch {
    return ''
  }
}

// ── Event label generator ──────────────────────────────

function eventLabel(event: NexusEvent): string {
  const payload = event.payload as Record<string, unknown>

  switch (event.event_type) {
    case 'card.created':
      return 'Card created'
    case 'card.moved': {
      const from = payload.from_lane as string | undefined
      const to = payload.to_lane as string | undefined
      if (from && to) return `Moved from ${from} to ${to}`
      if (to) return `Moved to ${to}`
      return 'Lane changed'
    }
    case 'card.assigned':
      return `Assigned to ${payload.assignee || 'unknown'}`
    case 'card.completed':
      return 'Completed'
    case 'card.bender_moved': {
      const to = payload.to_lane as string | undefined
      return `Bender lane: ${to || 'changed'}`
    }
    case 'comment.added':
      return `Comment by ${event.actor}`
    case 'comment.pivot':
      return `Pivot comment by ${event.actor}`
    case 'lock.acquired':
      return `Locked by ${event.actor}`
    case 'lock.released':
      return 'Unlocked'
    case 'scope.conflict':
      return 'Scope conflict'
    case 'context.stale':
      return 'Context stale'
    case 'session.started':
      return 'Session started'
    case 'session.ended':
      return 'Session ended'
    default:
      return event.event_type
  }
}

// ── EventTimeline Component ────────────────────────────

interface EventTimelineProps {
  cardId: string
}

export function EventTimeline({ cardId }: EventTimelineProps) {
  const [events, setEvents] = useState<NexusEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      setError(null)
      try {
        const { data } = await getCardEvents(cardId)
        // API returns DESC order (newest first), reverse for chronological display (oldest first)
        setEvents([...data].reverse())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [cardId])

  if (loading) {
    return (
      <div className="py-4 text-center">
        <p className="font-mono text-[11px] text-terminal-fg-tertiary">Loading events...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="font-mono text-[11px] text-status-error">{error}</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="font-mono text-[11px] text-terminal-fg-tertiary">No events recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event, idx) => {
        const Icon = EVENT_ICONS[event.event_type] || Activity
        const color = EVENT_COLORS[event.event_type] || 'text-terminal-fg-secondary'
        const label = eventLabel(event)
        const time = relativeTime(event.created_at)

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1 ${color}`}>
                <Icon className="h-3 w-3" />
              </div>
              {idx < events.length - 1 && (
                <div className="flex-1 w-px bg-terminal-border mt-1" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-mono text-[11px] font-medium ${color}`}>
                  {label}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded border font-mono text-[9px] uppercase tracking-wide ${actorColor(event.actor)} ${actorBadge(event.actor)}`}
                >
                  {event.actor}
                </span>
                <span className="font-mono text-[10px] text-terminal-fg-tertiary">
                  {time}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
