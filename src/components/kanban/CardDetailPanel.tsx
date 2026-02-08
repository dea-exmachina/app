'use client'

import { useEffect } from 'react'
import type { KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { SectionDivider } from '@/components/ui/section-divider'
import { formatDate } from '@/lib/client/formatters'

interface CardDetailPanelProps {
  card: KanbanCard
  lane: string
  onClose: () => void
}

function cardStatus(card: KanbanCard): string {
  if (card.completed) return 'done'
  if (card.startedAt) return 'in-progress'
  return 'pending'
}

export function CardDetailPanel({ card, lane, onClose }: CardDetailPanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const status = cardStatus(card)
  const assignee = card.metadata?.Assignee || card.metadata?.assignee || null
  const source = card.metadata?.Source || card.metadata?.source || null

  // Filter out known keys from metadata for "other" display
  const filteredMeta = Object.entries(card.metadata || {}).filter(
    ([key]) =>
      !['Assignee', 'assignee', 'Source', 'source', 'Started', 'started', 'Completed', 'completed'].includes(key)
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-terminal-bg-surface border-l border-terminal-border z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-semibold text-user-accent">
                  {card.id}
                </span>
                <StatusDot
                  status={statusToType(status)}
                  label={status}
                  size={6}
                />
              </div>
              <h2 className="font-mono text-[14px] font-semibold text-terminal-fg-primary leading-tight">
                {card.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-[12px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors px-1"
            >
              x
            </button>
          </div>

          {/* Key-value metadata */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[11px]">
            <div>
              <span className="text-terminal-fg-tertiary uppercase tracking-wider">Lane </span>
              <span className="text-terminal-fg-primary">{lane}</span>
            </div>
            {assignee && (
              <div>
                <span className="text-terminal-fg-tertiary uppercase tracking-wider">Assignee </span>
                <span className="text-terminal-fg-primary">{assignee}</span>
              </div>
            )}
            {card.startedAt && (
              <div>
                <span className="text-terminal-fg-tertiary uppercase tracking-wider">Started </span>
                <span className="text-terminal-fg-secondary">{formatDate(card.startedAt)}</span>
              </div>
            )}
            {card.completedAt && (
              <div>
                <span className="text-terminal-fg-tertiary uppercase tracking-wider">Completed </span>
                <span className="text-terminal-fg-secondary">{formatDate(card.completedAt)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <CardBadge key={tag} tag={tag} />
              ))}
            </div>
          )}

          {/* Description */}
          {card.description && (
            <div>
              <SectionDivider label="Description" />
              <p className="mt-1.5 font-mono text-[12px] text-terminal-fg-primary leading-relaxed whitespace-pre-wrap">
                {card.description}
              </p>
            </div>
          )}

          {/* Source */}
          {source && (
            <div>
              <SectionDivider label="Source" />
              <p className="mt-1.5 font-mono text-[11px] text-terminal-fg-secondary">
                {source}
              </p>
            </div>
          )}

          {/* Other metadata */}
          {filteredMeta.length > 0 && (
            <div>
              <SectionDivider label="Metadata" />
              <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                {filteredMeta.map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-terminal-fg-tertiary shrink-0">{key}:</span>
                    <span className="text-terminal-fg-secondary">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw markdown (collapsible) */}
          {card.rawMarkdown && (
            <details className="group">
              <summary className="font-mono text-[10px] text-terminal-fg-tertiary cursor-pointer hover:text-terminal-fg-secondary uppercase tracking-wider">
                Raw Markdown
              </summary>
              <pre className="mt-1.5 p-2 rounded-sm bg-terminal-bg-elevated font-mono text-[10px] text-terminal-fg-secondary overflow-x-auto whitespace-pre-wrap">
                {card.rawMarkdown}
              </pre>
            </details>
          )}
        </div>
      </div>
    </>
  )
}
