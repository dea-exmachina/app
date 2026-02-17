'use client'

import { useState, useEffect, useCallback } from 'react'

interface CardReassignProps {
  cardId: string
  currentProjectId: string | null
  onReassigned?: () => void
}

interface ProjectOption {
  id: string
  slug: string
  name: string
}

export function CardReassign({ cardId, currentProjectId, onReassigned }: CardReassignProps) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  // Check if reassignment feature is enabled
  useEffect(() => {
    fetch('/api/settings?key=card_reassignment_enabled')
      .then((r) => r.json())
      .then((data) => {
        if (data.value?.enabled) {
          setEnabled(true)
          // Load projects only if enabled
          return fetch('/api/nexus/projects')
            .then((r) => r.json())
            .then((json) => {
              const items = json.data ?? []
              setProjects(items.map((p: Record<string, unknown>) => ({
                id: p.id as string,
                slug: p.slug as string,
                name: p.name as string,
              })))
            })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleReassign = useCallback(async () => {
    if (!selectedProject || selectedProject === currentProjectId) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/nexus/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProject }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Failed to reassign')
      }
      setResult('Reassigned')
      setConfirming(false)
      onReassigned?.()
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }, [cardId, selectedProject, currentProjectId, onReassigned])

  if (loading || !enabled) return null

  const availableProjects = projects.filter((p) => p.id !== currentProjectId)
  if (availableProjects.length === 0) return null

  return (
    <div className="font-mono text-[11px]">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-terminal-fg-tertiary hover:text-status-warn transition-colors text-[10px] uppercase tracking-wider"
        >
          Reassign project
        </button>
      ) : (
        <div className="mt-1 space-y-1.5 p-2 border border-status-warn/30 rounded-sm bg-terminal-bg-elevated">
          <div className="text-status-warn text-[10px] uppercase tracking-wider font-bold">
            Reassign Card
          </div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded-sm px-2 py-1 text-[11px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
          >
            <option value="">Select project...</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setConfirming(false); setResult(null) }}
              className="text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary px-2 py-0.5"
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={submitting || !selectedProject}
              className="text-[10px] text-status-warn border border-status-warn/30 rounded-sm px-2 py-0.5 hover:bg-status-warn/10 disabled:opacity-50"
            >
              {submitting ? 'Moving...' : 'Confirm'}
            </button>
            {result && (
              <span className={`text-[9px] ${result === 'Reassigned' ? 'text-status-ok' : 'text-status-error'}`}>
                {result}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
