'use client'

import { useState, useEffect, useCallback } from 'react'
import { Rocket, ShieldCheck, Wrench, Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { getReleaseQueue, postInbox } from '@/lib/client/api'
import { ReleaseDetailPanel } from './ReleaseDetailPanel'
import type { ReleaseQueueCard, ReleaseQueueResponse, ReleaseCardStatus } from '@/types/nexus'

// ── Types ──────────────────────────────────────────────

type FilterMode = 'all' | 'flagged' | 'unflagged'

// ── Status helpers ──────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

function getCardStatus(card: ReleaseQueueCard): ReleaseCardStatus {
  if (card.blocked) return 'blocked'
  return 'clear'
}

/** Row background color based on release + flag status */
function rowStatusClass(card: ReleaseQueueCard): string {
  if (card.blocked) return 'bg-red-500/10 hover:bg-red-500/20'
  if (!card.ready_for_production) return 'hover:bg-terminal-bg-elevated'
  return 'bg-emerald-500/8 hover:bg-emerald-500/15'
}

function statusDotType(status: ReleaseCardStatus): 'ok' | 'warn' | 'error' {
  switch (status) {
    case 'blocked': return 'error'
    case 'clear': return 'ok'
    case 'pending_review': return 'warn'
  }
}

// ── Filter Toggle ──────────────────────────────────────

function FilterToggle({
  active,
  onChange,
}: {
  active: FilterMode
  onChange: (mode: FilterMode) => void
}) {
  const modes: FilterMode[] = ['all', 'flagged', 'unflagged']
  const labels: Record<FilterMode, string> = {
    all: 'ALL',
    flagged: 'FLAGGED',
    unflagged: 'UNFLAGGED',
  }

  return (
    <div className="flex rounded-sm border border-terminal-border overflow-hidden">
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`font-mono text-[9px] px-2 py-0.5 transition-colors ${
            active === mode
              ? 'bg-user-accent/15 text-user-accent border-user-accent/30'
              : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary hover:bg-terminal-bg-elevated'
          } ${mode !== 'all' ? 'border-l border-terminal-border' : ''}`}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  )
}

// ── Widget ──────────────────────────────────────────────

export function ReleaseQueueWidget() {
  const [data, setData] = useState<ReleaseQueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [actionState, setActionState] = useState<'idle' | 'requesting' | 'done'>('idle')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ReleaseQueueCard | null>(null)

  const fetchData = useCallback((filterMode: FilterMode) => {
    setLoading(true)
    getReleaseQueue(filterMode)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Initial load
  useEffect(() => {
    fetchData(filter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = useCallback((mode: FilterMode) => {
    setFilter(mode)
    fetchData(mode)
  }, [fetchData])

  // Refetch after panel close
  const handlePanelClose = useCallback(() => {
    setSelectedCard(null)
    fetchData(filter)
  }, [fetchData, filter])

  // ── Action handlers ────────────────────────────────────

  const handleReleaseClear = useCallback(async () => {
    if (!data) return
    const clearCards = data.cards.filter((c) => !c.blocked && c.ready_for_production)
    if (clearCards.length === 0) return
    setActionState('requesting')
    try {
      const cardList = clearCards.map((c) => `- ${c.card_id}: ${c.title}`).join('\n')
      await postInbox({
        title: `Release requested — ${clearCards.length} clear card(s)`,
        content: `${clearCards.length} cards cleared for production:\n\n${cardList}\n\nRequested from Control Center dashboard.`,
        type: 'instruction',
      })
      setActionState('done')
      setActionMessage(`Release requested for ${clearCards.length} card(s)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request release')
      setActionState('idle')
    }
  }, [data])

  const handleRequestReview = useCallback(async () => {
    if (!data) return
    const metaCards = data.cards.filter((c) => c.review_required && !c.blocked)
    if (metaCards.length === 0) return
    setActionState('requesting')
    try {
      const cardList = metaCards.map((c) => `- ${c.card_id}: ${c.title}`).join('\n')
      await postInbox({
        title: `Council review requested for ${metaCards.length} meta card(s)`,
        content: `Council review needed before production release:\n\n${cardList}\n\nRun /dea-council review on these cards. Findings block release until resolved.`,
        type: 'instruction',
      })
      setActionState('done')
      setActionMessage(`Council review requested for ${metaCards.length} card(s)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request review')
      setActionState('idle')
    }
  }, [data])

  const handleFixBlocked = useCallback(async () => {
    if (!data) return
    const blockedCards = data.cards.filter((c) => c.blocked)
    if (blockedCards.length === 0) return
    setActionState('requesting')
    try {
      const cardList = blockedCards
        .map((c) => `- ${c.card_id}: ${c.title} (${c.unresolved_council_comments} finding${c.unresolved_council_comments !== 1 ? 's' : ''})`)
        .join('\n')
      await postInbox({
        title: `Fix blocked cards — ${blockedCards.length} card(s) with council findings`,
        content: `These cards are blocked from release due to council findings:\n\n${cardList}\n\nAddress findings and resolve comments to unblock.`,
        type: 'instruction',
      })
      setActionState('done')
      setActionMessage(`Fix request sent for ${blockedCards.length} blocked card(s)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request fix')
      setActionState('idle')
    }
  }, [data])

  // ── Render states ──────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-status-error">
        {error}
      </div>
    )
  }

  // Compute flagged count for header ratio display
  const totalInReview = data?.total_in_review ?? 0
  const displayFlagged = filter === 'all'
    ? data?.cards.filter((c) => c.ready_for_production).length ?? 0
    : filter === 'flagged'
      ? data?.total ?? 0
      : (totalInReview - (data?.total ?? 0))

  return (
    <div className="h-full flex flex-col">
      {/* Header: ratio + filter toggle */}
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-2">
          <Flag className="h-3 w-3 text-status-ok" />
          <span className="font-mono text-[10px] text-terminal-fg-secondary">
            {loading ? '...' : `${displayFlagged}/${totalInReview} flagged`}
          </span>
          {data && data.blocked_count > 0 && (
            <StatusDot status="error" label={`${data.blocked_count} blocked`} size={5} />
          )}
        </div>
        <FilterToggle active={filter} onChange={handleFilterChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-xs font-mono text-terminal-fg-tertiary">
          Loading...
        </div>
      ) : !data || data.total === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-terminal-fg-tertiary">
          <Rocket className="h-5 w-5 opacity-40" />
          <span className="font-mono text-xs">
            {filter === 'flagged' ? 'No cards flagged for release'
              : filter === 'unflagged' ? 'No unflagged cards in review'
              : 'No cards in review'}
          </span>
        </div>
      ) : (
        <>
          {/* Card list */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-terminal-border-strong sticky top-0 z-10 bg-terminal-bg-surface">
                  <th className="terminal-label px-2 py-1 text-left font-normal w-[18px]" />
                  <th className="terminal-label px-2 py-1 text-left font-normal" style={{ width: '22%' }}>ID</th>
                  <th className="terminal-label px-2 py-1 text-left font-normal" style={{ width: '38%' }}>TITLE</th>
                  <th className="terminal-label px-2 py-1 text-left font-normal" style={{ width: '20%' }}>PROJECT</th>
                  <th className="terminal-label px-2 py-1 text-left font-normal" style={{ width: '15%' }}>PRI</th>
                </tr>
              </thead>
              <tbody>
                {data.cards.map((card) => {
                  const status = getCardStatus(card)
                  return (
                    <tr
                      key={card.card_id}
                      className={`h-7 border-b border-terminal-border cursor-pointer transition-colors ${rowStatusClass(card)}`}
                      onClick={() => setSelectedCard(card)}
                    >
                      <td className="px-1 py-1">
                        {card.ready_for_production ? (
                          <StatusDot status={statusDotType(status)} size={5} />
                        ) : (
                          <span className="inline-block w-[5px] h-[5px] rounded-full bg-terminal-border-strong" />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <span className="font-mono text-user-accent">{card.card_id}</span>
                      </td>
                      <td className="px-2 py-1">
                        <span className="text-terminal-fg-primary truncate block">{card.title}</span>
                      </td>
                      <td className="px-2 py-1">
                        <Badge variant="terminal">{card.project_prefix}</Badge>
                      </td>
                      <td className="px-2 py-1">
                        <span className={`font-mono uppercase ${PRIORITY_COLORS[card.priority] || ''}`}>
                          {card.priority}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Smart action buttons — only show when viewing flagged cards */}
          {filter !== 'unflagged' && (
            <div className="pt-2 px-2 border-t border-terminal-border space-y-1.5">
              {actionState === 'done' && actionMessage ? (
                <div className="text-center font-mono text-[10px] text-status-ok py-1">
                  {actionMessage} — check inbox
                </div>
              ) : (
                <>
                  {data.cards.some((c) => !c.blocked && c.ready_for_production) && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full font-mono text-[10px]"
                      onClick={handleReleaseClear}
                      disabled={actionState === 'requesting'}
                    >
                      <Rocket className="h-3 w-3 mr-1" />
                      {actionState === 'requesting'
                        ? 'Requesting...'
                        : `Release ${data.cards.filter((c) => !c.blocked && c.ready_for_production).length} Clear Card${data.cards.filter((c) => !c.blocked && c.ready_for_production).length !== 1 ? 's' : ''}`}
                    </Button>
                  )}

                  {data.blocked_count > 0 && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full font-mono text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handleFixBlocked}
                      disabled={actionState === 'requesting'}
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Fix Blocked ({data.blocked_count})
                    </Button>
                  )}

                  {data.cards.some((c) => c.review_required) && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-full font-mono text-[10px] border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                      onClick={handleRequestReview}
                      disabled={actionState === 'requesting'}
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Request Council Review
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail panel overlay */}
      {selectedCard && (
        <ReleaseDetailPanel
          card={selectedCard}
          onClose={handlePanelClose}
        />
      )}
    </div>
  )
}
