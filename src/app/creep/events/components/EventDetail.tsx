'use client'

import type { CreepEvent } from '@/types/creep'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EventTypeBadge } from './EventTypeBadge'
import { formatRelativeDate } from '@/lib/client/formatters'
import { Button } from '@/components/ui/button'
import { Link2 } from 'lucide-react'

interface EventDetailProps {
  event: CreepEvent | null
  open: boolean
  onClose: () => void
  onTraceClick: (traceId: string) => void
  relatedEvents: CreepEvent[]
  loadingRelated: boolean
}

export function EventDetail({
  event,
  open,
  onClose,
  onTraceClick,
  relatedEvents,
  loadingRelated,
}: EventDetailProps) {
  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <EventTypeBadge type={event.type} />
            <Badge variant="outline" className="font-mono text-xs">
              {event.source}
            </Badge>
          </div>
          <SheetTitle className="text-base">{event.summary}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {new Date(event.created_at).toLocaleString()} ({formatRelativeDate(event.created_at)})
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetadataField label="ID" value={event.id} mono />
              <MetadataField label="Type" value={event.type} mono />
              <MetadataField label="Source" value={event.source} mono />
              <MetadataField label="Actor" value={event.actor ?? 'N/A'} mono />
              <MetadataField label="Project" value={event.project ?? 'global'} mono />
              <MetadataField label="Processed" value={event.processed ? 'Yes' : 'No'} />
            </div>

            {/* Trace ID */}
            {event.trace_id && (
              <>
                <Separator />
                <div>
                  <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                    Trace ID
                  </h3>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                      {event.trace_id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onTraceClick(event.trace_id as string)}
                      title="Filter by this trace"
                    >
                      <Link2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Payload */}
            <Separator />
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                Payload
              </h3>
              <pre className="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all max-h-64">
                {Object.keys(event.payload).length > 0
                  ? JSON.stringify(event.payload, null, 2)
                  : '{}'}
              </pre>
            </div>

            {/* Related events (trace correlation) */}
            {event.trace_id && (
              <>
                <Separator />
                <div>
                  <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                    Related Events ({relatedEvents.length})
                  </h3>
                  {loadingRelated ? (
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  ) : relatedEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No related events found.</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedEvents
                        .filter((e) => e.id !== event.id)
                        .map((related) => (
                          <div
                            key={related.id}
                            className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/50"
                          >
                            <EventTypeBadge type={related.type} />
                            <span className="text-xs truncate flex-1">{related.summary}</span>
                            <span className="font-mono text-xs text-muted-foreground shrink-0">
                              {formatRelativeDate(related.created_at)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function MetadataField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <p className={`text-sm truncate ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </p>
    </div>
  )
}
