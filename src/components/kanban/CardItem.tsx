import { useCallback, useState, type MouseEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Flag, CheckCircle2, Square, CheckSquare } from 'lucide-react'
import type { KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { StatusDot, statusToType } from '@/components/ui/status-dot'

interface CardItemProps {
  card: KanbanCard
  onClick?: () => void
  onSelect?: (cardId: string, additive: boolean, shift: boolean) => void
  onContextMenu?: (e: MouseEvent, card: KanbanCard) => void
  draggable?: boolean
  selected?: boolean
  anySelected?: boolean
  unresolvedCount?: number
  hasQuestions?: boolean
  isReviewLane?: boolean
  onReview?: (cardId: string) => void
}

/** Compute relative age from a date string */
function relativeAge(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const diffMs = Date.now() - d.getTime()
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)
    if (diffH < 1) return 'just now'
    if (diffH < 24) return `${diffH}h ago`
    return `${diffD}d ago`
  } catch {
    return ''
  }
}

/** Derive a display status from card state */
function cardStatus(card: KanbanCard): string {
  if (card.completed) return 'done'
  if (card.startedAt) return 'in-progress'
  return 'pending'
}

/** Derive project prefix from card ID (e.g. CC-085 → CC, NEXUS-101 → NEX, DEA-237 → DEA) */
function projectPrefix(cardId: string): string | null {
  const match = cardId.match(/^([A-Z][A-Z0-9-]*?)-\d+$/)
  if (!match) return null
  const raw = match[1]
  // Shorten long prefixes for compact display
  return raw.length > 4 ? raw.slice(0, 3) : raw
}

export function CardItem({
  card,
  onClick,
  onSelect,
  onContextMenu,
  draggable = false,
  selected = false,
  anySelected = false,
  unresolvedCount,
  hasQuestions,
  isReviewLane = false,
  onReview,
}: CardItemProps) {
  const assignee = card.metadata?.Assignee || card.metadata?.assignee || null
  const age = relativeAge(card.startedAt || card.completedAt)
  const status = cardStatus(card)
  const prefix = projectPrefix(card.id)
  const [reviewed, setReviewed] = useState(card.reviewed ?? false)
  const [reviewing, setReviewing] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: !draggable,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (isDragging) return
      // Shift+Click = range select
      if (e.shiftKey && onSelect) {
        e.preventDefault()
        e.stopPropagation()
        onSelect(card.id, true, true)
        return
      }
      // Ctrl/Cmd+Click = toggle selection (additive)
      if ((e.ctrlKey || e.metaKey) && onSelect) {
        e.preventDefault()
        e.stopPropagation()
        onSelect(card.id, true, false)
        return
      }
      onClick?.()
    },
    [isDragging, onClick, onSelect, card.id]
  )

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (onContextMenu) {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(e, card)
      }
    },
    [onContextMenu, card]
  )

  const handleReview = useCallback(
    async (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (reviewed || reviewing) return
      setReviewing(true)
      try {
        const res = await fetch(`/api/kanban/cards/${card.id}/review`, { method: 'PATCH' })
        if (res.ok) {
          setReviewed(true)
          onReview?.(card.id)
        }
      } finally {
        setReviewing(false)
      }
    },
    [card.id, reviewed, reviewing, onReview]
  )

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(card.projectColor ? { borderLeftColor: card.projectColor, borderLeftWidth: '3px' } : {}),
      }}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`group rounded-sm border p-2 transition-colors cursor-pointer ${
        selected
          ? 'border-user-accent ring-1 ring-user-accent/40 bg-user-accent/5'
          : 'border-terminal-border bg-terminal-bg-surface hover:border-terminal-border-strong'
      } ${card.completed ? 'opacity-50' : ''} ${isDragging ? 'opacity-30' : ''} ${draggable ? 'touch-none' : ''}`}
    >
      {/* Line 1: checkbox + ID + unresolved badge + tags + project prefix + status dot */}
      <div className="flex items-center gap-1.5 mb-0.5">
        {/* Checkbox: visible on hover when anySelected, or always when selected */}
        {onSelect && (
          <button
            className={`shrink-0 transition-opacity ${selected || anySelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelect(card.id, true, false)
            }}
            title={selected ? 'Deselect card' : 'Select card'}
          >
            {selected
              ? <CheckSquare className="h-3 w-3 text-user-accent" />
              : <Square className="h-3 w-3 text-terminal-fg-tertiary" />
            }
          </button>
        )}
        <span className="font-mono text-[10px] font-semibold text-user-accent shrink-0">
          {card.id}
        </span>
        {unresolvedCount != null && unresolvedCount > 0 && (
          <span className={`font-mono text-[9px] px-1 rounded-sm shrink-0 ${
            hasQuestions
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-terminal-bg-elevated text-terminal-fg-secondary'
          }`}>
            {unresolvedCount}
          </span>
        )}
        <div className="flex gap-1 flex-1 min-w-0 overflow-hidden">
          {card.tags.slice(0, 3).map((tag) => (
            <CardBadge key={tag} tag={tag} />
          ))}
        </div>
        {card.readyForProduction && (
          <Flag className="h-3 w-3 text-status-ok shrink-0" />
        )}
        {isReviewLane && (
          reviewed ? (
            <CheckCircle2 className="h-3 w-3 text-status-ok shrink-0" aria-label="Reviewed — ready for production" />
          ) : (
            <button
              onClick={handleReview}
              disabled={reviewing}
              title="Mark as reviewed (enables production promotion)"
              className="font-mono text-[8px] px-1 py-px rounded-sm shrink-0 border border-terminal-border text-terminal-fg-tertiary hover:border-user-accent hover:text-user-accent transition-colors disabled:opacity-50"
            >
              {reviewing ? '…' : '✓'}
            </button>
          )
        )}
        {prefix && card.projectColor && (
          <span
            className="font-mono text-[8px] px-1 py-px rounded-sm shrink-0 font-semibold"
            style={{ color: card.projectColor, backgroundColor: `${card.projectColor}20` }}
          >
            {prefix}
          </span>
        )}
        <StatusDot status={statusToType(status)} size={5} />
      </div>

      {/* Epic tag (if parent exists) */}
      {card.parentCardId && (
        <div className="font-mono text-[9px] text-terminal-fg-tertiary mb-0.5">
          ↑ {card.parentCardId}
        </div>
      )}

      {/* Line 2: Title */}
      <div
        className={`font-mono text-[11px] leading-tight truncate ${
          card.completed
            ? 'text-terminal-fg-tertiary line-through'
            : 'text-terminal-fg-primary'
        }`}
      >
        {card.title}
      </div>

      {/* Line 3: Assignee + age */}
      {(assignee || age) && (
        <div className="flex items-center justify-between mt-0.5 font-mono text-[10px] text-terminal-fg-tertiary">
          <span>{assignee || '--'}</span>
          <span>{age}</span>
        </div>
      )}
    </div>
  )
}
