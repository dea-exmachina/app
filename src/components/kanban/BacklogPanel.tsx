'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, ArrowUp } from 'lucide-react'
import type { KanbanCard } from '@/types/kanban'
import { moveCard } from '@/lib/client/api'

type SortField = 'priority' | 'age' | 'project'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

interface BacklogPanelProps {
  cards: KanbanCard[]
  onPromote: (cardId: string) => void
  onBulkPromote: (cardIds: string[]) => void
}

export function BacklogPanel({ cards, onPromote, onBulkPromote }: BacklogPanelProps) {
  const [open, setOpen] = useState(true)
  const [sortField, setSortField] = useState<SortField>('priority')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const sortedCards = [...cards].sort((a, b) => {
    if (sortField === 'priority') {
      const pa = PRIORITY_ORDER[a.metadata?.Priority?.toLowerCase() ?? 'normal'] ?? 2
      const pb = PRIORITY_ORDER[b.metadata?.Priority?.toLowerCase() ?? 'normal'] ?? 2
      if (pa !== pb) return pa - pb
      return a.id.localeCompare(b.id)
    }
    if (sortField === 'age') {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return da - db  // oldest first
    }
    if (sortField === 'project') {
      const pa = a.metadata?.Project ?? ''
      const pb = b.metadata?.Project ?? ''
      return pa.localeCompare(pb) || a.id.localeCompare(b.id)
    }
    return 0
  })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handlePromote = useCallback(async (cardId: string) => {
    await moveCard(cardId, 'ready')
    onPromote(cardId)
  }, [onPromote])

  const handleBulkPromote = useCallback(async () => {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => moveCard(id, 'ready')))
    onBulkPromote(ids)
    setSelectedIds(new Set())
  }, [selectedIds, onBulkPromote])

  return (
    <div className="mt-3 border border-terminal-border rounded-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-terminal-bg-elevated transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3 w-3 text-terminal-fg-tertiary" />
          ) : (
            <ChevronRight className="h-3 w-3 text-terminal-fg-tertiary" />
          )}
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-terminal-fg-secondary">
            BACKLOG
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-terminal-bg-elevated text-terminal-fg-tertiary">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {/* Sort controls */}
          {(['priority', 'age', 'project'] as SortField[]).map(f => (
            <button
              key={f}
              onClick={() => setSortField(f)}
              className={`font-mono text-[9px] uppercase transition-colors ${
                sortField === f
                  ? 'text-user-accent'
                  : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
              }`}
            >
              {f}
            </button>
          ))}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkPromote}
              className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-user-accent/40 text-user-accent bg-user-accent/5 hover:bg-user-accent/10 transition-colors ml-2"
            >
              PROMOTE {selectedIds.size} →
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      {open && (
        <div className="border-t border-terminal-border divide-y divide-terminal-border/50">
          {sortedCards.length === 0 ? (
            <div className="px-3 py-4 font-mono text-[11px] text-terminal-fg-tertiary text-center">
              Backlog empty
            </div>
          ) : (
            sortedCards.map(card => (
              <div
                key={card.id}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-terminal-bg-elevated transition-colors cursor-pointer ${
                  selectedIds.has(card.id) ? 'bg-user-accent/5' : ''
                }`}
                onClick={() => toggleSelect(card.id)}
              >
                {/* Checkbox */}
                <div className={`h-3 w-3 rounded-sm border shrink-0 transition-colors ${
                  selectedIds.has(card.id)
                    ? 'border-user-accent bg-user-accent'
                    : 'border-terminal-border'
                }`} />

                {/* Card ID */}
                <span className="font-mono text-[10px] font-semibold text-user-accent shrink-0 w-[80px]">
                  {card.id}
                </span>

                {/* Priority */}
                {card.metadata?.Priority && (
                  <span className={`font-mono text-[9px] px-1 rounded-sm shrink-0 ${
                    card.metadata.Priority === 'critical' ? 'bg-status-error/15 text-status-error' :
                    card.metadata.Priority === 'high' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-terminal-bg-elevated text-terminal-fg-tertiary'
                  }`}>
                    {card.metadata.Priority.toUpperCase()}
                  </span>
                )}

                {/* Project */}
                {card.metadata?.Project && (
                  <span className="font-mono text-[9px] text-terminal-fg-tertiary shrink-0">
                    {card.metadata.Project}
                  </span>
                )}

                {/* Title */}
                <span className="font-mono text-[11px] text-terminal-fg-primary truncate flex-1 min-w-0">
                  {card.title}
                </span>

                {/* Promote button */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handlePromote(card.id)
                  }}
                  className="shrink-0 flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:border-user-accent/40 hover:text-user-accent transition-colors"
                  title="Promote to Ready"
                >
                  <ArrowUp className="h-2.5 w-2.5" />
                  READY
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
