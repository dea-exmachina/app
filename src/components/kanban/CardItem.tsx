import type { KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { CardMetadata } from './CardMetadata'
import { truncate } from '@/lib/client/formatters'

interface CardItemProps {
  card: KanbanCard
}

export function CardItem({ card }: CardItemProps) {
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

      {/* Metadata */}
      <CardMetadata metadata={card.metadata} />
    </div>
  )
}
