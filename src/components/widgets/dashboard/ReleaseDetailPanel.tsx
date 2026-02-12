'use client'

import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/ui/status-dot'
import { SectionDivider } from '@/components/ui/section-divider'
import { CommentThread } from '@/components/kanban/CommentThread'
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
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

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

          {/* Blocked warning */}
          {card.blocked && (
            <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="font-mono text-[11px] text-red-400">
                This card has {card.unresolved_council_comments} unresolved council finding{card.unresolved_council_comments !== 1 ? 's' : ''}.
                Resolve all findings to unblock for release.
              </p>
            </div>
          )}

          {/* Divider */}
          <SectionDivider label="Council & Comments" />

          {/* Comment Thread — reuse existing component */}
          <CommentThread cardId={card.card_id} />
        </div>
      </div>
    </>
  )
}
