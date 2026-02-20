'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'

interface Sprint {
  id: string
  name: string
  status: string
  goal?: string
  start_date?: string
  end_date?: string
}

interface RolloverPreview {
  currentSprint: Sprint
  newSprintName: string
  carryForward: Array<{ card_id: string; title: string; lane: string }>
  blocked: Array<{ card_id: string; title: string }>
}

interface SprintRolloverModalProps {
  sprint: Sprint
  onClose: () => void
  onComplete: () => void
}

export function SprintRolloverModal({ sprint, onClose, onComplete }: SprintRolloverModalProps) {
  const [preview, setPreview] = useState<RolloverPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/kanban/sprints/${sprint.id}/rollover?preview=true`, { method: 'POST' })
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error.message)
        setPreview(json.data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [sprint.id])

  const handleConfirm = useCallback(async () => {
    setExecuting(true)
    try {
      const res = await fetch(`/api/kanban/sprints/${sprint.id}/rollover`, { method: 'POST' })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rollover failed')
      setExecuting(false)
    }
  }, [sprint.id, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[520px] max-h-[80vh] overflow-y-auto rounded-sm border border-terminal-border bg-terminal-bg-surface shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border px-4 py-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-user-accent" />
            <span className="font-mono text-[12px] font-semibold text-terminal-fg-primary">
              Sprint Rollover
            </span>
          </div>
          <button onClick={onClose} className="text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Current sprint */}
          <div>
            <div className="font-mono text-[10px] text-terminal-fg-tertiary uppercase mb-1">Closing</div>
            <div className="font-mono text-[11px] text-terminal-fg-primary">{sprint.name}</div>
          </div>

          {loading && (
            <div className="font-mono text-[11px] text-terminal-fg-tertiary py-4 text-center">
              Loading preview…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-status-error border border-status-error/30 rounded-sm px-3 py-2 bg-status-error/5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}

          {preview && !loading && (
            <>
              {/* New sprint name */}
              <div>
                <div className="font-mono text-[10px] text-terminal-fg-tertiary uppercase mb-1">Opening</div>
                <div className="font-mono text-[11px] text-user-accent">{preview.newSprintName}</div>
              </div>

              {/* Carry forward */}
              <div>
                <div className="font-mono text-[10px] text-terminal-fg-tertiary uppercase mb-2">
                  Carrying Forward ({preview.carryForward.length})
                </div>
                {preview.carryForward.length === 0 ? (
                  <div className="font-mono text-[10px] text-terminal-fg-tertiary">No cards to carry</div>
                ) : (
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {preview.carryForward.map(c => (
                      <div key={c.card_id} className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-user-accent shrink-0 w-[80px]">{c.card_id}</span>
                        <span className="px-1 rounded-sm bg-terminal-bg-elevated text-terminal-fg-tertiary shrink-0 text-[9px]">{c.lane}</span>
                        <span className="text-terminal-fg-secondary truncate">{c.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked (not carrying) */}
              {preview.blocked.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] text-amber-400 uppercase mb-2">
                    Blocked — Not Carrying ({preview.blocked.length})
                  </div>
                  <div className="space-y-1">
                    {preview.blocked.map(c => (
                      <div key={c.card_id} className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-user-accent shrink-0 w-[80px]">{c.card_id}</span>
                        <span className="text-terminal-fg-tertiary truncate">{c.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-terminal-border px-4 py-3">
          <button
            onClick={onClose}
            className="font-mono text-[10px] px-3 py-1.5 rounded-sm border border-terminal-border text-terminal-fg-secondary hover:text-terminal-fg-primary transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={executing || loading || !!error}
            className="font-mono text-[10px] px-3 py-1.5 rounded-sm border border-user-accent text-user-accent bg-user-accent/5 hover:bg-user-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {executing ? 'ROLLING OVER…' : 'CONFIRM ROLLOVER'}
          </button>
        </div>
      </div>
    </div>
  )
}
