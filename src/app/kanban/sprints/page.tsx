'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { SprintRolloverModal } from '@/components/kanban/SprintRolloverModal'

interface Sprint {
  id: string
  name: string
  status: string
  goal?: string
  start_date?: string
  end_date?: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-status-ok border-status-ok/30 bg-status-ok/5',
  planning: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  completed: 'text-terminal-fg-tertiary border-terminal-border bg-terminal-bg-elevated',
}

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [rolloverSprint, setRolloverSprint] = useState<Sprint | null>(null)

  const fetchSprints = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kanban/sprints')
      const json = await res.json()
      setSprints(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSprints() }, [])

  const activeSprint = sprints.find(s => s.status === 'active')

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-[14px] font-semibold uppercase tracking-wider text-terminal-fg-primary">
            Sprints
          </h1>
          <p className="font-mono text-[11px] text-terminal-fg-tertiary mt-1">
            Sprint lifecycle management — close, open, carry forward.
          </p>
        </div>
        {activeSprint && (
          <button
            onClick={() => setRolloverSprint(activeSprint)}
            className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded-sm border border-user-accent/40 text-user-accent bg-user-accent/5 hover:bg-user-accent/10 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            ROLLOVER {activeSprint.name}
          </button>
        )}
      </div>

      {loading && (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">Loading sprints…</div>
      )}

      {!loading && sprints.length === 0 && (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary border border-dashed border-terminal-border rounded-sm p-8 text-center">
          No sprints yet
        </div>
      )}

      {!loading && sprints.length > 0 && (
        <div className="border border-terminal-border rounded-sm divide-y divide-terminal-border/50">
          {sprints.map(sprint => (
            <div key={sprint.id} className="flex items-center gap-4 px-4 py-3 hover:bg-terminal-bg-elevated transition-colors">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] text-terminal-fg-primary">{sprint.name}</div>
                {sprint.goal && (
                  <div className="font-mono text-[10px] text-terminal-fg-tertiary mt-0.5 truncate">{sprint.goal}</div>
                )}
              </div>
              {sprint.start_date && sprint.end_date && (
                <div className="font-mono text-[9px] text-terminal-fg-tertiary shrink-0">
                  {sprint.start_date} → {sprint.end_date}
                </div>
              )}
              <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm border shrink-0 ${STATUS_COLORS[sprint.status] ?? STATUS_COLORS.completed}`}>
                {sprint.status.toUpperCase()}
              </span>
              {sprint.status === 'active' && (
                <button
                  onClick={() => setRolloverSprint(sprint)}
                  className="shrink-0 font-mono text-[9px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:border-user-accent/40 hover:text-user-accent transition-colors"
                >
                  ROLLOVER
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {rolloverSprint && (
        <SprintRolloverModal
          sprint={rolloverSprint}
          onClose={() => setRolloverSprint(null)}
          onComplete={() => {
            setRolloverSprint(null)
            fetchSprints()
          }}
        />
      )}
    </div>
  )
}
