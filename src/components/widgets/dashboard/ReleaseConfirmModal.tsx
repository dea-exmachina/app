'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Rocket, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { triggerRelease } from '@/lib/client/api'
import type { ReleaseQueueCard } from '@/types/nexus'

// ── Priority color mapping ──────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

// ── Modal Component ─────────────────────────────────────

interface ReleaseConfirmModalProps {
  cards: ReleaseQueueCard[]
  onClose: () => void
  onReleaseComplete: (result: {
    runId: string
    dispatched: string[]
    skipped: string[]
  }) => void
}

export function ReleaseConfirmModal({
  cards,
  onClose,
  onReleaseComplete,
}: ReleaseConfirmModalProps) {
  const [state, setState] = useState<'idle' | 'dispatching' | 'done' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [mode, setMode] = useState<'now' | 'schedule'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const ccCards = cards.filter((c) => c.card_id.startsWith('CC-'))
  const nonCcCards = cards.filter((c) => !c.card_id.startsWith('CC-'))

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'idle') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, state])

  const handleConfirm = useCallback(async () => {
    setState('dispatching')
    setErrorMessage('')
    try {
      let scheduledAt: string | undefined
      if (mode === 'schedule' && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      }
      const result = await triggerRelease(cards.map((c) => c.card_id), scheduledAt)
      setState('done')
      setTimeout(() => {
        onReleaseComplete({
          runId: result.data.run_id,
          dispatched: result.data.dispatched_cards,
          skipped: result.data.skipped_cards,
        })
      }, 800)
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to trigger release')
    }
  }, [cards, onReleaseComplete, mode, scheduledDate, scheduledTime])

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={state === 'idle' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-terminal-bg-surface border border-terminal-border rounded-sm max-w-lg w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-terminal-border">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-user-accent" />
              <h2 className="font-mono text-[14px] font-semibold text-terminal-fg-primary">
                Confirm Release
              </h2>
            </div>
            <p className="font-mono text-[11px] text-terminal-fg-tertiary mt-1">
              {ccCards.length} CC card{ccCards.length !== 1 ? 's' : ''} will be merged to production
            </p>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-4">
            {nonCcCards.length > 0 && (
              <div className="rounded-sm border border-status-warn/30 bg-status-warn/10 px-3 py-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-status-warn" />
                  <span className="font-mono text-[10px] text-status-warn">
                    {nonCcCards.length} non-CC card{nonCcCards.length !== 1 ? 's' : ''} excluded
                  </span>
                </div>
                <p className="font-mono text-[10px] text-terminal-fg-tertiary mt-1">
                  {nonCcCards.map((c) => c.card_id).join(', ')} — requires manual release via dea
                </p>
              </div>
            )}

            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-terminal-fg-tertiary uppercase tracking-wider text-[10px]">
                  <th className="text-left pb-2 pr-3">ID</th>
                  <th className="text-left pb-2 pr-3">Title</th>
                  <th className="text-left pb-2">Pri</th>
                </tr>
              </thead>
              <tbody>
                {ccCards.map((card) => (
                  <tr key={card.card_id} className="border-t border-terminal-border/50">
                    <td className="py-1.5 pr-3 text-user-accent whitespace-nowrap">
                      {card.card_id}
                    </td>
                    <td className="py-1.5 pr-3 text-terminal-fg-primary truncate max-w-[250px]">
                      {card.title}
                    </td>
                    <td className={`py-1.5 uppercase whitespace-nowrap ${PRIORITY_COLORS[card.priority] || ''}`}>
                      {card.priority}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Schedule toggle */}
          <div className="px-4 pb-2">
            <div className="flex rounded-sm border border-terminal-border overflow-hidden">
              <button
                onClick={() => setMode('now')}
                className={`flex-1 font-mono text-[10px] px-3 py-1.5 transition-colors flex items-center justify-center gap-1 ${
                  mode === 'now'
                    ? 'bg-user-accent/15 text-user-accent'
                    : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
                }`}
              >
                <Rocket className="h-3 w-3" />
                Release Now
              </button>
              <button
                onClick={() => setMode('schedule')}
                className={`flex-1 font-mono text-[10px] px-3 py-1.5 transition-colors border-l border-terminal-border flex items-center justify-center gap-1 ${
                  mode === 'schedule'
                    ? 'bg-user-accent/15 text-user-accent'
                    : 'text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
                }`}
              >
                <Clock className="h-3 w-3" />
                Schedule
              </button>
            </div>

            {mode === 'schedule' && (
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 bg-terminal-bg border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-28 bg-terminal-bg border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
                />
              </div>
            )}
          </div>

          {/* Error message */}
          {state === 'error' && errorMessage && (
            <div className="px-4 pb-2">
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="font-mono text-[10px] text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-terminal-border flex gap-2 justify-end">
            <Button
              variant="outline"
              size="xs"
              className="font-mono text-[10px]"
              onClick={onClose}
              disabled={state === 'dispatching'}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="xs"
              className={`font-mono text-[10px] ${
                state === 'done'
                  ? 'border-status-ok/30 text-status-ok'
                  : 'border-user-accent/30 text-user-accent hover:bg-user-accent/10'
              }`}
              onClick={handleConfirm}
              disabled={state === 'dispatching' || state === 'done' || ccCards.length === 0 || (mode === 'schedule' && (!scheduledDate || !scheduledTime))}
            >
              {mode === 'schedule' ? <Clock className="h-3 w-3 mr-1" /> : <Rocket className="h-3 w-3 mr-1" />}
              {state === 'idle' && (mode === 'now' ? 'Confirm Release' : 'Schedule Release')}
              {state === 'dispatching' && (mode === 'now' ? 'Dispatching...' : 'Scheduling...')}
              {state === 'done' && (mode === 'now' ? 'Dispatched!' : 'Scheduled!')}
              {state === 'error' && 'Retry'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
