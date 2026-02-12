import { useCallback, type MouseEvent } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { StatusDot, statusToType } from '@/components/ui/status-dot'

interface CardItemProps {
  card: KanbanCard
  onClick?: () => void
  onSelect?: (cardId: string, additive: boolean) => void
  onContextMenu?: (e: MouseEvent, card: KanbanCard) => void
  draggable?: boolean
  selected?: boolean
  unresolvedCount?: number
  hasQuestions?: boolean
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

export function CardItem({
  card,
  onClick,
  onSelect,
  onContextMenu,
  draggable = false,
  selected = false,
  unresolvedCount,
  hasQuestions,
}: CardItemProps) {
  const assignee = card.metadata?.Assignee || card.metadata?.assignee || null
  const age = relativeAge(card.startedAt || card.completedAt)
  const status = cardStatus(card)

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
      // Ctrl/Cmd+Click = toggle selection
      if ((e.ctrlKey || e.metaKey) && onSelect) {
        e.preventDefault()
        e.stopPropagation()
        onSelect(card.id, true)
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`rounded-sm border p-2 transition-colors cursor-pointer ${
        selected
          ? 'border-user-accent ring-1 ring-user-accent/40 bg-user-accent/5'
          : 'border-terminal-border bg-terminal-bg-surface hover:border-terminal-border-strong'
      } ${card.completed ? 'opacity-50' : ''} ${isDragging ? 'opacity-30' : ''} ${draggable ? 'touch-none' : ''}`}
    >
      {/* Line 1: ID + unresolved badge + tags + status dot */}
      <div className="flex items-center gap-1.5 mb-0.5">
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
        <StatusDot status={statusToType(status)} size={5} />
      </div>

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
