'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, ArrowUp, ArrowUpDown, Send, X } from 'lucide-react'
import type { KanbanCard } from '@/types/kanban'
import { moveCard, postComment } from '@/lib/client/api'

type SortField = 'priority' | 'age' | 'project' | 'updated'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const SURFACE_TEMPLATE = `SURFACE:
- DB:
- API:
- UI:
- Types:
- Tests:
- Docs:
- Config: `

function isSurfaceGateError(msg: string) {
  return msg.includes('SURFACE gate') || msg.includes('SURFACE comment')
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

interface SurfaceFormProps {
  cardId: string
  onSubmit: (cardId: string, content: string) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

function SurfaceForm({ cardId, onSubmit, onCancel, submitting }: SurfaceFormProps) {
  const [text, setText] = useState(SURFACE_TEMPLATE)

  return (
    <div
      className="border-t border-amber-500/20 bg-amber-500/5 px-3 py-2 space-y-2"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400">
          SURFACE map required to promote
        </span>
        <button onClick={onCancel} className="text-terminal-fg-tertiary hover:text-terminal-fg-secondary">
          <X className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={9}
        className="w-full font-mono text-[10px] bg-terminal-bg border border-terminal-border rounded-sm px-2 py-1.5 text-terminal-fg-primary resize-none focus:outline-none focus:border-user-accent/40"
        spellCheck={false}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="font-mono text-[9px] px-2 py-0.5 text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
        >
          cancel
        </button>
        <button
          onClick={() => onSubmit(cardId, text)}
          disabled={submitting}
          className="flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-sm border border-user-accent/40 text-user-accent bg-user-accent/5 hover:bg-user-accent/10 disabled:opacity-40 transition-colors"
        >
          <Send className="h-2.5 w-2.5" />
          {submitting ? 'posting…' : 'POST & PROMOTE'}
        </button>
      </div>
    </div>
  )
}

interface BacklogPanelProps {
  cards: KanbanCard[]
  onPromote: (cardId: string) => void
  onBulkPromote: (cardIds: string[]) => void
}

export function BacklogPanel({ cards, onPromote, onBulkPromote }: BacklogPanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('kanban-backlog-open')
    return stored === null ? true : stored === 'true'
  })
  const [sortField, setSortField] = useState<SortField>('priority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // card id → 'surface' | 'error:message' | null
  const [cardState, setCardState] = useState<Record<string, string | null>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  const handleSortClick = useCallback((f: SortField) => {
    if (f === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(f)
      setSortDir('asc')
    }
  }, [sortField])

  const sortedCards = [...cards].sort((a, b) => {
    let cmp = 0
    if (sortField === 'priority') {
      const pa = PRIORITY_ORDER[a.metadata?.Priority?.toLowerCase() ?? 'normal'] ?? 2
      const pb = PRIORITY_ORDER[b.metadata?.Priority?.toLowerCase() ?? 'normal'] ?? 2
      cmp = pa !== pb ? pa - pb : a.id.localeCompare(b.id)
    } else if (sortField === 'age') {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      cmp = da - db
    } else if (sortField === 'updated') {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      cmp = da - db
    } else if (sortField === 'project') {
      const pa = a.metadata?.Project ?? ''
      const pb = b.metadata?.Project ?? ''
      cmp = pa.localeCompare(pb) || a.id.localeCompare(b.id)
    }
    return sortDir === 'desc' ? -cmp : cmp
  })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const attemptPromote = useCallback(async (cardId: string) => {
    try {
      await moveCard(cardId, 'ready')
      setCardState(prev => { const n = { ...prev }; delete n[cardId]; return n })
      onPromote(cardId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to promote card'
      if (isSurfaceGateError(msg)) {
        setCardState(prev => ({ ...prev, [cardId]: 'surface' }))
      } else {
        setCardState(prev => ({ ...prev, [cardId]: `error:${msg}` }))
      }
    }
  }, [onPromote])

  const handleSurfaceSubmit = useCallback(async (cardId: string, content: string) => {
    setSubmitting(cardId)
    try {
      await postComment(cardId, { author: 'dea', content, comment_type: 'surface' })
      await attemptPromote(cardId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post SURFACE comment'
      setCardState(prev => ({ ...prev, [cardId]: `error:${msg}` }))
    } finally {
      setSubmitting(null)
    }
  }, [attemptPromote])

  const handleBulkPromote = useCallback(async () => {
    const ids = Array.from(selectedIds)
    await Promise.all(ids.map(id => attemptPromote(id)))
    // Only clear selection for cards that succeeded (no pending surface forms)
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => { if (!cardState[id]) next.delete(id) })
      return next
    })
    onBulkPromote(ids.filter(id => !cardState[id]))
  }, [selectedIds, cardState, attemptPromote, onBulkPromote])

  return (
    <div className="mt-3 border border-terminal-border rounded-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-terminal-bg-elevated transition-colors"
        onClick={() => setOpen(v => {
          const next = !v
          localStorage.setItem('kanban-backlog-open', String(next))
          return next
        })}
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
          {(['priority', 'age', 'updated', 'project'] as SortField[]).map(f => (
            <button
              key={f}
              onClick={() => handleSortClick(f)}
              className={`flex items-center gap-0.5 font-mono text-[9px] uppercase transition-colors ${
                sortField === f
                  ? 'text-user-accent'
                  : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
              }`}
            >
              {f}
              {sortField === f ? (
                <span className="text-[8px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
              ) : (
                <ArrowUpDown className="h-2 w-2 opacity-40" />
              )}
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
            sortedCards.map(card => {
              const state = cardState[card.id]
              const showSurface = state === 'surface'
              const errorMsg = state?.startsWith('error:') ? state.slice(6) : null

              return (
                <div key={card.id} className="divide-y divide-terminal-border/30">
                  <div
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

                    {/* Last Updated */}
                    <span
                      className="w-[28px] text-right font-mono text-[9px] text-terminal-fg-tertiary shrink-0"
                      title={card.updatedAt ?? ''}
                    >
                      {timeAgo(card.updatedAt)}
                    </span>

                    {/* Promote button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (showSurface) {
                          setCardState(prev => { const n = { ...prev }; delete n[card.id]; return n })
                        } else {
                          attemptPromote(card.id)
                        }
                      }}
                      className={`shrink-0 flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-sm border transition-colors ${
                        showSurface
                          ? 'border-amber-500/40 text-amber-400 bg-amber-500/5'
                          : 'border-terminal-border text-terminal-fg-tertiary hover:border-user-accent/40 hover:text-user-accent'
                      }`}
                      title={showSurface ? 'Cancel' : 'Promote to Ready'}
                    >
                      <ArrowUp className="h-2.5 w-2.5" />
                      {showSurface ? 'CANCEL' : 'READY'}
                    </button>
                  </div>

                  {/* Inline error (non-surface failures) */}
                  {errorMsg && (
                    <div className="flex items-start gap-2 px-3 py-1.5 bg-status-error/5">
                      <span className="font-mono text-[10px] text-status-error flex-1">{errorMsg}</span>
                      <button
                        onClick={() => setCardState(prev => { const n = { ...prev }; delete n[card.id]; return n })}
                        className="shrink-0 text-status-error/60 hover:text-status-error"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Inline SURFACE form */}
                  {showSurface && (
                    <SurfaceForm
                      cardId={card.id}
                      onSubmit={handleSurfaceSubmit}
                      onCancel={() => setCardState(prev => { const n = { ...prev }; delete n[card.id]; return n })}
                      submitting={submitting === card.id}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
