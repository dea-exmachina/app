'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCcw, Bug, GitBranch, Eye } from 'lucide-react'
import type { KanbanCard } from '@/types/kanban'
import { CardDetailPanel } from './CardDetailPanel'

type ReopenType = 'bug_fix' | 'scope_change'

interface Props {
  projects: Array<{ id: string; name: string }>
}

export function HistorySearch({ projects }: Props) {
  const [query, setQuery] = useState('')
  const [lane, setLane] = useState('done')
  const [project, setProject] = useState('')
  const [cardType, setCardType] = useState('')
  const [results, setResults] = useState<KanbanCard[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null)
  const [detailCard, setDetailCard] = useState<KanbanCard | null>(null)
  const [reopenModalCardId, setReopenModalCardId] = useState<string | null>(null)
  const [reopenType, setReopenType] = useState<ReopenType>('bug_fix')
  const [reopenNote, setReopenNote] = useState('')

  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (lane) params.set('lane', lane)
      if (project) params.set('project', project)
      if (cardType) params.set('type', cardType)

      const res = await fetch(`/api/kanban/history?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setResults(json.data ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, lane, project, cardType])

  useEffect(() => {
    const timeout = setTimeout(fetchResults, 300)
    return () => clearTimeout(timeout)
  }, [fetchResults])

  const handleReopenConfirm = async () => {
    if (!reopenModalCardId) return
    const cardId = reopenModalCardId
    setFeedback(null)
    setReopenModalCardId(null)
    try {
      // done → in_progress with reason capture
      const res = await fetch(`/api/nexus/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane: 'in_progress',
          reopen_type: reopenType,
          reopen_note: reopenNote || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: { message?: string } }).error?.message ?? 'Re-open failed')
      }
      const json = await res.json().catch(() => ({}))
      const typed = json as { data?: { reopen_count?: number }; bender_slug?: string }
      const message = typed.bender_slug
        ? `Reassigned to ${typed.bender_slug} for regression investigation`
        : 'Card re-opened → In Progress'
      setResults(prev => prev.filter(c => c.id !== cardId))
      setFeedback({ id: cardId, type: 'success', message })
    } catch (err) {
      setFeedback({ id: cardId, type: 'error', message: err instanceof Error ? err.message : 'Re-open failed' })
    }
    setReopenType('bug_fix')
    setReopenNote('')
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleAction = async (cardId: string, action: 'bug' | 'branch') => {
    setFeedback(null)
    try {
      if (action === 'bug') {
        const card = results.find(c => c.id === cardId)
        const res = await fetch('/api/nexus/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Bug: ${card?.title ?? 'Issue'}`,
            card_type: 'bug',
            lane: 'ready',
            ...(card?.projectId ? { project_id: card.projectId } : {}),
          }),
        })
        if (!res.ok) throw new Error('Bug creation failed')
        const bugJson = await res.json().catch(() => ({}))
        const bugCardId = (bugJson as { data?: { card_id?: string } }).data?.card_id
        const proj = card?.metadata.Project ?? 'project'
        setFeedback({ id: cardId, type: 'success', message: bugCardId ? `Bug ${bugCardId} → ${proj} ready` : `Bug created → ${proj} ready` })
      } else if (action === 'branch') {
        const card = results.find(c => c.id === cardId)
        const res = await fetch('/api/nexus/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Feature: ${card?.title ?? 'New'}`,
            card_type: 'task',
            lane: 'ready',
            ...(card?.projectId ? { project_id: card.projectId } : {}),
          }),
        })
        if (!res.ok) throw new Error('Branch task creation failed')
        const branchJson = await res.json().catch(() => ({}))
        const branchCardId = (branchJson as { data?: { card_id?: string } }).data?.card_id
        const branchProj = card?.metadata.Project ?? 'project'
        setFeedback({ id: cardId, type: 'success', message: branchCardId ? `Task ${branchCardId} → ${branchProj} ready` : `Task created → ${branchProj} ready` })
      }
    } catch (err) {
      setFeedback({ id: cardId, type: 'error', message: err instanceof Error ? err.message : 'Action failed' })
    }

    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Search bar + filters */}
        <div className="flex flex-col gap-3 p-4 bg-terminal-bg-surface border border-terminal-border rounded-sm">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-terminal-fg-tertiary" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search card ID, title, summary, tags…"
              className="w-full pl-8 pr-3 py-2 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-terminal-fg-tertiary">Lane</label>
              <select
                value={lane}
                onChange={e => setLane(e.target.value)}
                className="px-2 py-1.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[10px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
              >
                <option value="">All</option>
                <option value="done">Done</option>
                <option value="review">Review</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready</option>
                <option value="backlog">Backlog</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-terminal-fg-tertiary">Project</label>
              <select
                value={project}
                onChange={e => setProject(e.target.value)}
                className="px-2 py-1.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[10px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
              >
                <option value="">All</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-terminal-fg-tertiary">Type</label>
              <select
                value={cardType}
                onChange={e => setCardType(e.target.value)}
                className="px-2 py-1.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[10px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
              >
                <option value="">All</option>
                <option value="epic">Epic</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="chore">Chore</option>
                <option value="research">Research</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2">
          {loading && <p className="font-mono text-[11px] text-terminal-fg-tertiary px-3">Loading…</p>}
          {!loading && results.length === 0 && (
            <p className="font-mono text-[11px] text-terminal-fg-tertiary px-3">No results</p>
          )}
          {!loading && results.map(card => {
            const cardFeedback = feedback?.id === card.id ? feedback : null
            const isModalOpen = reopenModalCardId === card.id
            return (
              <div
                key={card.id}
                className="flex flex-col gap-2 p-3 bg-terminal-bg-surface border border-terminal-border rounded-sm hover:border-user-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-user-accent">{card.id}</span>
                      {card.metadata.Type && (
                        <span className="px-1.5 py-0.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[9px] text-terminal-fg-tertiary uppercase">
                          {card.metadata.Type}
                        </span>
                      )}
                      {card.metadata.Lane && (
                        <span className="px-1.5 py-0.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[9px] text-terminal-fg-tertiary">
                          {card.metadata.Lane}
                        </span>
                      )}
                      {card.metadata.Project && (
                        <span className="px-1.5 py-0.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[9px] text-terminal-fg-secondary">
                          {card.metadata.Project}
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono text-[11px] text-terminal-fg-primary truncate">{card.title}</h3>
                    {card.completedAt && (
                      <p className="font-mono text-[9px] text-terminal-fg-tertiary mt-0.5">
                        Completed: {new Date(card.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setReopenType('bug_fix')
                        setReopenNote('')
                        setReopenModalCardId(card.id)
                      }}
                      className="p-1.5 hover:bg-terminal-bg-elevated rounded-sm transition-colors group"
                      title="Re-open to In Progress"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-terminal-fg-tertiary group-hover:text-user-accent" />
                    </button>
                    <button
                      onClick={() => handleAction(card.id, 'bug')}
                      className="p-1.5 hover:bg-terminal-bg-elevated rounded-sm transition-colors group"
                      title="File Bug Report"
                    >
                      <Bug className="h-3.5 w-3.5 text-terminal-fg-tertiary group-hover:text-user-accent" />
                    </button>
                    <button
                      onClick={() => handleAction(card.id, 'branch')}
                      className="p-1.5 hover:bg-terminal-bg-elevated rounded-sm transition-colors group"
                      title="Branch New Task"
                    >
                      <GitBranch className="h-3.5 w-3.5 text-terminal-fg-tertiary group-hover:text-user-accent" />
                    </button>
                    <button
                      onClick={() => setDetailCard(card)}
                      className="p-1.5 hover:bg-terminal-bg-elevated rounded-sm transition-colors group"
                      title="View Detail"
                    >
                      <Eye className="h-3.5 w-3.5 text-terminal-fg-tertiary group-hover:text-user-accent" />
                    </button>
                  </div>
                </div>

                {/* Inline re-open reason modal */}
                {isModalOpen && (
                  <div className="mt-1 p-3 bg-terminal-bg-elevated border border-terminal-border rounded-sm flex flex-col gap-3">
                    <p className="font-mono text-[10px] text-terminal-fg-secondary font-semibold">
                      Why are you re-opening this card?
                    </p>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`reopen-type-${card.id}`}
                          value="bug_fix"
                          checked={reopenType === 'bug_fix'}
                          onChange={() => setReopenType('bug_fix')}
                          className="mt-0.5 accent-user-accent"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] text-terminal-fg-primary">bug_fix</span>
                          <span className="font-mono text-[9px] text-terminal-fg-tertiary">Original implementation didn&apos;t work as intended</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`reopen-type-${card.id}`}
                          value="scope_change"
                          checked={reopenType === 'scope_change'}
                          onChange={() => setReopenType('scope_change')}
                          className="mt-0.5 accent-user-accent"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-mono text-[10px] text-terminal-fg-primary">scope_change</span>
                          <span className="font-mono text-[9px] text-terminal-fg-tertiary">Requirements changed or expanded</span>
                        </span>
                      </label>
                    </div>

                    <textarea
                      value={reopenNote}
                      onChange={e => setReopenNote(e.target.value)}
                      placeholder="Note (optional)"
                      rows={2}
                      className="w-full px-2 py-1.5 bg-terminal-bg-surface border border-terminal-border rounded-sm font-mono text-[10px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent resize-none"
                    />

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setReopenModalCardId(null)
                          setReopenType('bug_fix')
                          setReopenNote('')
                        }}
                        className="px-3 py-1 border border-terminal-border rounded-sm font-mono text-[10px] text-terminal-fg-secondary hover:text-terminal-fg-primary hover:border-terminal-fg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReopenConfirm}
                        className="px-3 py-1 bg-user-accent/10 border border-user-accent/40 rounded-sm font-mono text-[10px] text-user-accent hover:bg-user-accent/20 transition-colors"
                      >
                        Re-open
                      </button>
                    </div>
                  </div>
                )}

                {cardFeedback && (
                  <div
                    className={`px-2 py-1 rounded-sm font-mono text-[9px] ${
                      cardFeedback.type === 'success'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {cardFeedback.message}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {detailCard && (
        <CardDetailPanel
          card={detailCard}
          lane={detailCard.metadata.Lane ?? 'done'}
          onClose={() => setDetailCard(null)}
        />
      )}
    </>
  )
}
