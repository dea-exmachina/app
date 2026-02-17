'use client'

import { useState, useCallback } from 'react'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import { SectionDivider } from '@/components/ui/section-divider'

interface FeatureRequestForm {
  title: string
  description: string
  priority: 'normal' | 'high' | 'low'
}

export function FeatureRequestWidget() {
  const { data } = useProjectDashboardContext()
  const [form, setForm] = useState<FeatureRequestForm>({
    title: '',
    description: '',
    priority: 'normal',
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) return
    if (!data.nexusProject) {
      setResult({ type: 'error', message: 'No NEXUS project linked' })
      return
    }

    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/nexus/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: data.nexusProject.id,
          title: form.title.trim(),
          summary: `PROBLEM: Feature request from project page.\n\nSOLUTION: ${form.description.trim() || form.title.trim()}\n\nUSER IMPACT: TBD`,
          priority: form.priority,
          lane: 'backlog',
          source: 'webapp',
          delegation_tag: 'BENDER',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Failed to create card')
      }

      const json = await res.json()
      const cardId = json.data?.card_id ?? 'unknown'
      setResult({ type: 'success', message: `Created ${cardId}` })
      setForm({ title: '', description: '', priority: 'normal' })
      setExpanded(false)
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit',
      })
    } finally {
      setSubmitting(false)
    }
  }, [form, data.nexusProject])

  if (!data.nexusProject) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        No kanban board linked
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-1">
      <SectionDivider label="Feature Request" />

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 w-full py-2 border border-dashed border-terminal-border rounded-sm font-mono text-[11px] text-terminal-fg-tertiary hover:border-user-accent hover:text-user-accent transition-colors"
        >
          + Submit a feature request
        </button>
      ) : (
        <div className="mt-1 space-y-2">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Feature title..."
            className="w-full px-2 py-1.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            autoFocus
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)..."
            rows={3}
            className="w-full px-2 py-1.5 bg-terminal-bg-elevated border border-terminal-border rounded-sm font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as FeatureRequestForm['priority'] }))}
              className="bg-terminal-bg-elevated border border-terminal-border rounded-sm px-2 py-1 font-mono text-[10px] text-terminal-fg-primary focus:outline-none focus:border-user-accent"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={() => { setExpanded(false); setResult(null) }}
              className="font-mono text-[10px] text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title.trim()}
              className="font-mono text-[10px] text-terminal-fg-primary bg-user-accent/20 border border-user-accent/30 rounded-sm px-3 py-1 hover:bg-user-accent/30 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`font-mono text-[10px] px-1 ${
          result.type === 'success' ? 'text-status-ok' : 'text-status-error'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  )
}
