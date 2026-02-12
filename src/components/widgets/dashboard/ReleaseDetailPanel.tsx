'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ExternalLink, Flag, FlagOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { CommentThread } from '@/components/kanban/CommentThread'
import { EventTimeline } from '@/components/kanban/EventTimeline'
import { updateCard } from '@/lib/client/api'
import type { ReleaseQueueCard, ReleaseCardStatus } from '@/types/nexus'

// ── Status helpers ──────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

function getCardStatus(card: ReleaseQueueCard): ReleaseCardStatus {
  if (card.blocked) return 'blocked'
  if (card.review_required && card.unresolved_council_comments === 0) return 'clear'
  return 'clear'
}

function statusLabel(status: ReleaseCardStatus): string {
  switch (status) {
    case 'blocked': return 'BLOCKED'
    case 'clear': return 'CLEAR'
    case 'pending_review': return 'PENDING REVIEW'
  }
}

function statusDotType(status: ReleaseCardStatus): 'ok' | 'warn' | 'error' {
  switch (status) {
    case 'blocked': return 'error'
    case 'clear': return 'ok'
    case 'pending_review': return 'warn'
  }
}

// ── Panel Component ─────────────────────────────────────

interface ReleaseDetailPanelProps {
  card: ReleaseQueueCard
  onClose: () => void
}

export function ReleaseDetailPanel({ card, onClose }: ReleaseDetailPanelProps) {
  const [isReviewed, setIsReviewed] = useState(card.ready_for_production)
  const [flagState, setFlagState] = useState<'idle' | 'toggling'>('idle')
  const [activeTab, setActiveTab] = useState<'comments' | 'audit'>('comments')

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleToggleFlag = useCallback(async () => {
    if (flagState !== 'idle') return
    setFlagState('toggling')
    const newValue = !isReviewed
    try {
      await updateCard(card.card_id, { ready_for_production: newValue })
      setIsReviewed(newValue)
    } catch (err) {
      console.warn('Toggle flag failed:', err)
    } finally {
      setFlagState('idle')
    }
  }, [flagState, isReviewed, card.card_id])

  const status = getCardStatus(card)

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
                  {card.card_id}
                </span>
                <StatusDot
                  status={statusDotType(status)}
                  label={statusLabel(status)}
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
              <span className="text-terminal-fg-tertiary uppercase tracking-wider">Project </span>
              <Badge variant="terminal">{card.project_prefix}</Badge>
            </div>
            <div>
              <span className="text-terminal-fg-tertiary uppercase tracking-wider">Priority </span>
              <span className={`uppercase ${PRIORITY_COLORS[card.priority] || ''}`}>
                {card.priority}
              </span>
            </div>
            <div>
              <span className="text-terminal-fg-tertiary uppercase tracking-wider">Lane </span>
              <span className="text-terminal-fg-primary">{card.lane}</span>
            </div>
            {card.review_required && (
              <div>
                <span className="text-terminal-fg-tertiary uppercase tracking-wider">Council </span>
                <span className={card.blocked ? 'text-status-error' : 'text-status-ok'}>
                  {card.blocked
                    ? `${card.unresolved_council_comments} finding${card.unresolved_council_comments !== 1 ? 's' : ''}`
                    : 'Passed'}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {card.project_slug && (
              <Link
                href={`/kanban/${card.project_slug}`}
                className="flex-1"
              >
                <Button
                  variant="outline"
                  size="xs"
                  className="w-full font-mono text-[10px]"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in Board
                </Button>
              </Link>
            )}
            {!card.blocked && (
              <Button
                variant="outline"
                size="xs"
                className={`flex-1 font-mono text-[10px] ${
                  isReviewed
                    ? 'border-status-ok/30 text-status-ok hover:bg-status-ok/10'
                    : 'border-terminal-border text-terminal-fg-secondary hover:bg-terminal-bg-elevated'
                }`}
                onClick={handleToggleFlag}
                disabled={flagState === 'toggling'}
              >
                {isReviewed ? (
                  <>
                    <FlagOff className="h-3 w-3 mr-1" />
                    {flagState === 'toggling' ? 'Updating...' : 'Mark as Pending'}
                  </>
                ) : (
                  <>
                    <Flag className="h-3 w-3 mr-1" />
                    {flagState === 'toggling' ? 'Updating...' : 'Mark as Reviewed'}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Blocked warning */}
          {card.blocked && (
            <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="font-mono text-[11px] text-red-400">
                This card has {card.unresolved_council_comments} unresolved council finding{card.unresolved_council_comments !== 1 ? 's' : ''}.
                Resolve all findings to unblock for release.
              </p>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex border-b border-terminal-border">
            <button
              onClick={() => setActiveTab('comments')}
              className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                activeTab === 'comments'
                  ? 'text-user-accent border-b-2 border-user-accent'
                  : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 transition-colors ${
                activeTab === 'audit'
                  ? 'text-user-accent border-b-2 border-user-accent'
                  : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
              }`}
            >
              Audit Trail
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'comments' ? (
            <CommentThread cardId={card.card_id} />
          ) : (
            <EventTimeline cardId={card.card_id} />
          )}
        </div>
      </div>
    </>
  )
}
