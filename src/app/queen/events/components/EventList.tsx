'use client'

import { useState, useCallback } from 'react'
import type { QueenEvent } from '@/types/queen'
import { useQueenEvents } from '@/hooks/useQueenEvents'
import { EventCard } from './EventCard'
import { EventDetail } from './EventDetail'
import { EventFilters } from './EventFilters'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Radio } from 'lucide-react'

const PAGE_SIZE = 50

export function EventList() {
  const [selectedType, setSelectedType] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [traceFilter, setTraceFilter] = useState<string | undefined>(undefined)
  const [selectedEvent, setSelectedEvent] = useState<QueenEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Main event query
  const {
    events,
    loading,
    error,
    refresh,
    lastUpdated,
  } = useQueenEvents({
    type: selectedType || undefined,
    source: selectedSource || undefined,
    traceId: traceFilter,
    limit: PAGE_SIZE,
    pollInterval: 10000,
  })

  // Related events for trace correlation (fetched separately when detail is open)
  const {
    events: relatedEvents,
    loading: loadingRelated,
  } = useQueenEvents({
    traceId: selectedEvent?.trace_id ?? undefined,
    limit: 20,
    pollInterval: 0, // no polling for related events
  })

  const handleSelect = useCallback((event: QueenEvent) => {
    setSelectedEvent(event)
    setDetailOpen(true)
  }, [])

  const handleTraceClick = useCallback((traceId: string) => {
    setTraceFilter(traceId)
    setSelectedType('')
    setSelectedSource('')
    setDetailOpen(false)
  }, [])

  const handleClearTrace = useCallback(() => {
    setTraceFilter(undefined)
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <EventFilters
        selectedType={selectedType}
        selectedSource={selectedSource}
        onTypeChange={setSelectedType}
        onSourceChange={setSelectedSource}
        onRefresh={refresh}
        lastUpdated={lastUpdated}
        loading={loading}
      />

      {/* Active trace filter indicator */}
      {traceFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
          <Radio className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            Filtered by trace:
          </span>
          <code className="font-mono text-xs">{traceFilter.slice(0, 12)}...</code>
          <button
            onClick={handleClearTrace}
            className="ml-auto font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="border rounded-lg overflow-hidden">
        {loading && events.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : events.length === 0 ? (
          <EmptyState hasFilters={!!selectedType || !!selectedSource || !!traceFilter} />
        ) : (
          <div>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={handleSelect}
                onTraceClick={handleTraceClick}
              />
            ))}
            {events.length >= PAGE_SIZE && (
              <div className="px-4 py-3 text-center">
                <span className="font-mono text-xs text-muted-foreground">
                  Showing {events.length} events (max {PAGE_SIZE})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <EventDetail
        event={selectedEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onTraceClick={handleTraceClick}
        relatedEvents={relatedEvents}
        loadingRelated={loadingRelated}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm font-medium mb-1">Failed to load events</p>
      <p className="text-xs text-muted-foreground mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="font-mono text-xs text-primary hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Radio className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">
        {hasFilters ? 'No matching events' : 'No events yet'}
      </p>
      <p className="text-xs text-muted-foreground">
        {hasFilters
          ? 'Try adjusting your filters to see more events.'
          : 'Events will appear here as they flow through the QUEEN pipeline.'}
      </p>
    </div>
  )
}
