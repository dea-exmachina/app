import type { KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { CardMetadata } from './CardMetadata'
import { truncate } from '@/lib/client/formatters'

interface CardItemProps {
  card: KanbanCard
}

/** Format date string as short date (e.g., "Feb 6") */
function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

export function CardItem({ card }: CardItemProps) {
  // Extract timestamp fields from metadata
  const startedAt = card.startedAt || card.metadata?.Started || card.metadata?.started
  const completedAt = card.completedAt || card.metadata?.Completed || card.metadata?.completed

  // Filter out timestamp keys from metadata for separate display
  const filteredMetadata = Object.fromEntries(
    Object.entries(card.metadata || {}).filter(
      ([key]) => !['Started', 'started', 'Completed', 'completed'].includes(key)
    )
  )

  const hasTimestamps = startedAt || completedAt

  return (
    <div
      className={`rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 ${
        card.completed ? 'opacity-60' : ''
      }`}
    >
      {/* Header: ID + Checkbox */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="font-mono text-xs font-semibold text-primary">
          {card.id}
        </div>
        {card.completed && (
          <div className="shrink-0 text-xs text-muted-foreground">✓</div>
        )}
      </div>

      {/* Title */}
      <h4
        className={`mb-2 text-sm font-semibold leading-tight ${
          card.completed ? 'text-muted-foreground line-through' : ''
        }`}
      >
        {card.title}
      </h4>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <CardBadge key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Description */}
      {card.description && (
        <p className="mb-2 text-xs text-muted-foreground">
          {truncate(card.description, 120)}
        </p>
      )}

      {/* Other Metadata */}
      <CardMetadata metadata={filteredMetadata} />

      {/* Timestamps Footer */}
      {hasTimestamps && (
        <div className="mt-2 flex gap-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
          {startedAt && (
            <span title={startedAt}>
              ▶ {formatShortDate(startedAt)}
            </span>
          )}
          {completedAt && (
            <span title={completedAt}>
              ✓ {formatShortDate(completedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
