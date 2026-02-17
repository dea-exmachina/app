'use client'

import type { CreepEvent } from '@/types/creep'
import { EventTypeBadge } from './EventTypeBadge'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate } from '@/lib/client/formatters'

interface EventCardProps {
  event: CreepEvent
  onSelect: (event: CreepEvent) => void
  onTraceClick: (traceId: string) => void
}

export function EventCard({ event, onSelect, onTraceClick }: EventCardProps) {
  return (
    <button
      onClick={() => onSelect(event)}
      className="w-full text-left px-4 py-3 border-b border-border hover:bg-accent/30 transition-colors focus:outline-none focus:bg-accent/40"
    >
      <div className="flex items-start gap-3">
        {/* Left: type badge + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <EventTypeBadge type={event.type} />
            {event.source && (
              <Badge variant="outline" className="font-mono text-xs">
                {event.source}
              </Badge>
            )}
            {event.actor && (
              <span className="font-mono text-xs text-muted-foreground truncate">
                {event.actor}
              </span>
            )}
          </div>
          <p className="text-sm truncate">{event.summary}</p>
          {/* Trace + project indicators */}
          <div className="flex items-center gap-2 mt-1">
            {event.trace_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTraceClick(event.trace_id as string)
                }}
                className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted"
                title={`Trace: ${event.trace_id}`}
              >
                trace:{event.trace_id.slice(0, 8)}
              </button>
            )}
            {event.project && (
              <span className="font-mono text-xs text-muted-foreground">
                {event.project}
              </span>
            )}
          </div>
        </div>

        {/* Right: timestamp */}
        <div className="shrink-0 text-right">
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeDate(event.created_at)}
          </span>
        </div>
      </div>
    </button>
  )
}
