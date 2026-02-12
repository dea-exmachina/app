'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Rocket, ShieldCheck, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { getReleaseQueue, postInbox, getReleaseRunStatus } from '@/lib/client/api'
import { ReleaseDetailPanel } from './ReleaseDetailPanel'
import { ReleaseConfirmModal } from './ReleaseConfirmModal'
import type { ReleaseQueueCard, ReleaseQueueResponse, ReleaseCardStatus } from '@/types/nexus'

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

/** Row background color based on release status */
function rowStatusClass(card: ReleaseQueueCard): string {
  if (card.blocked) return 'bg-red-500/10 hover:bg-red-500/20'
  if (card.review_required) return 'bg-emerald-500/8 hover:bg-emerald-500/15'
  return 'bg-emerald-500/8 hover:bg-emerald-500/15'
}

function statusDotType(status: ReleaseCardStatus): 'ok' | 'warn' | 'error' {
  switch (status) {
    case 'blocked': return 'error'
    case 'clear': return 'ok'
    case 'pending_review': return 'warn'
  }
}

// ── Widget ──────────────────────────────────────────────

export function ReleaseQueueWidget() {
  const [data, setData] = useState<ReleaseQueueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<'idle' | 'requesting' | 'done'>('idle')
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ReleaseQueueCard | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [releaseStatus, setReleaseStatus] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(() => {
    getReleaseQueue()
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll release run status when active
  useEffect(() => {
    if (!activeRunId) return
    pollRef.current = setInterval(async () => {
      try {
        const { data: status } = await getReleaseRunStatus(activeRunId)
        if (['completed', 'partial_failure', 'failed'].includes(status.status)) {
          setActiveRunId(null)
          setReleaseStatus(
            status.status === 'completed'
              ? `Release complete: ${status.summary}`
              : status.status === 'partial_failure'
                ? `Partial release: ${status.summary}`
                : `Release failed: ${status.summary}`
          )
          fetchData() // Refresh queue
        } else {
          setReleaseStatus(
            status.status === 'in_progress'
              ? 'Merging to production...'
              : 'Pipeline dispatched...'
          )
        }
      } catch {
        /* ignore polling errors */
      }
    }, 15000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeRunId, fetchData])

  // Refetch after panel close (comments may have changed blocking status)
  const handlePanelClose = useCallback(() => {
    setSelectedCard(null)
    getReleaseQueue()
      .then(({ data: d }) => setData(d))
      .catch(() => {/* silent refetch failure */})
  }, [])

  // ── Action handlers ────────────────────────────────────

  const handleReleaseClear = useCallback(() => {
    if (!data) return
    const clearCards = data.cards.filter((c) => !c.blocked && c.ready_for_production)
    if (clearCards.length === 0) return
    setShowConfirmModal(true)
  }, [data])

  const handleReleaseComplete = useCallback((result: { runId: string; dispatched: string[]; skipped: string[] }) => {
    setShowConfirmModal(false)
    setActiveRunId(result.runId)
    setActionState('done')
    setReleaseStatus('Pipeline dispatched...')
    setActionMessage(`Release dispatched for ${result.dispatched.length} card(s)`)
  }, [])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        Loading release queue...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-status-error">
        {error}
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-terminal-fg-tertiary">
        <Rocket className="h-5 w-5 opacity-40" />
        <span className="font-mono text-xs">No cards flagged for release</span>
      </div>
    )
  }

  const { cards, total, blocked_count, clear_count } = data
  const projectCount = new Set(cards.map((c) => c.project_prefix)).size
  const hasBlocked = blocked_count > 0
  const hasClear = clear_count > 0

  return (
    <div className="h-full flex flex-col">
      {/* Header with counts */}
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="font-mono text-[10px] text-terminal-fg-secondary">
          {total} card{total !== 1 ? 's' : ''} across {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          {clear_count > 0 && (
            <StatusDot status="ok" label={`${clear_count} clear`} size={5} />
          )}
          {blocked_count > 0 && (
            <StatusDot status="error" label={`${blocked_count} blocked`} size={5} />
          )}
        </div>
      </div>

      {/* Card list with status-colored rows */}
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
            {cards.map((card) => {
              const status = getCardStatus(card)
              return (
                <tr
                  key={card.card_id}
                  className={`h-7 border-b border-terminal-border cursor-pointer transition-colors ${rowStatusClass(card)}`}
                  onClick={() => setSelectedCard(card)}
                >
                  <td className="px-1 py-1">
                    <StatusDot status={statusDotType(status)} size={5} />
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

      {/* Smart action buttons */}
      <div className="pt-2 px-2 border-t border-terminal-border space-y-1.5">
        {/* Release pipeline status */}
        {releaseStatus && (
          <div className={`text-center font-mono text-[10px] py-1 ${
            releaseStatus.includes('complete') ? 'text-status-ok'
              : releaseStatus.includes('failed') || releaseStatus.includes('Partial') ? 'text-status-error'
                : 'text-user-accent animate-pulse'
          }`}>
            {releaseStatus}
          </div>
        )}
        {actionState === 'done' && actionMessage && !releaseStatus ? (
          <div className="text-center font-mono text-[10px] text-status-ok py-1">
            {actionMessage}
          </div>
        ) : (
          <>
            {/* Primary: Release clear cards */}
            {hasClear && (
              <Button
                variant="outline"
                size="xs"
                className="w-full font-mono text-[10px]"
                onClick={handleReleaseClear}
                disabled={actionState === 'requesting'}
              >
                <Rocket className="h-3 w-3 mr-1" />
                {actionState === 'requesting' ? 'Requesting...' : `Release ${clear_count} Clear Card${clear_count !== 1 ? 's' : ''}`}
              </Button>
            )}

            {/* Secondary: Fix blocked */}
            {hasBlocked && (
              <Button
                variant="outline"
                size="xs"
                className="w-full font-mono text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleFixBlocked}
                disabled={actionState === 'requesting'}
              >
                <Wrench className="h-3 w-3 mr-1" />
                Fix Blocked ({blocked_count})
              </Button>
            )}

            {/* Tertiary: Request council review */}
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

      {/* Detail panel overlay */}
      {selectedCard && (
        <ReleaseDetailPanel
          card={selectedCard}
          onClose={handlePanelClose}
        />
      )}

      {/* Release confirmation modal */}
      {showConfirmModal && data && (
        <ReleaseConfirmModal
          cards={data.cards.filter((c) => !c.blocked && c.ready_for_production)}
          onClose={() => setShowConfirmModal(false)}
          onReleaseComplete={handleReleaseComplete}
        />
      )}
    </div>
  )
}
