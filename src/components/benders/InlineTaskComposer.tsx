'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Send, Plus, X } from 'lucide-react'
import { createTask } from '@/lib/client/api'
import type { BenderTaskCreateRequest } from '@/types/bender'

// ── List input ────────────────────────────────────

function ListInput({
  label,
  items,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    onChange([...items, draft.trim()])
    setDraft('')
  }

  return (
    <div className="space-y-1">
      <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="flex-1 font-mono text-[11px] text-terminal-fg-secondary bg-terminal-bg-elevated rounded-sm px-2 py-1">
            {item}
          </span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            disabled={disabled}
            className="text-terminal-fg-tertiary hover:text-red-400 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="font-mono text-[9px] px-1.5 py-1 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-user-accent hover:border-user-accent transition-colors disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// ── Inline composer ───────────────────────────────

interface InlineTaskComposerProps {
  onCreated?: (taskId: string) => void
}

export function InlineTaskComposer({ onCreated }: InlineTaskComposerProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [overview, setOverview] = useState('')
  const [context, setContext] = useState('')
  const [requirements, setRequirements] = useState<string[]>([])
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([])
  const [references, setReferences] = useState<string[]>([])
  const [constraints, setConstraints] = useState<string[]>([])
  const [priority, setPriority] = useState<'normal' | 'focus'>('normal')
  const [branch, setBranch] = useState('dev')

  const canSubmit = title.trim() && overview.trim() && requirements.length > 0 && acceptanceCriteria.length > 0

  const reset = () => {
    setTitle(''); setOverview(''); setContext('')
    setRequirements([]); setAcceptanceCriteria([])
    setReferences([]); setConstraints([])
    setPriority('normal'); setBranch('dev')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const body: BenderTaskCreateRequest = {
        title: title.trim(),
        overview: overview.trim(),
        requirements,
        acceptanceCriteria,
        priority,
        branch,
      }
      if (context.trim()) body.context = context.trim()
      if (references.length) body.references = references
      if (constraints.length) body.constraints = constraints

      const { data } = await createTask(body)
      reset()
      setOpen(false)
      onCreated?.(data.taskId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-terminal-border rounded-sm">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 font-mono text-[11px] text-terminal-fg-secondary hover:text-user-accent transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="uppercase tracking-wider font-semibold">New Task</span>
      </button>

      {/* Collapsible form */}
      {open && (
        <form onSubmit={handleSubmit} className="px-3 pb-3 space-y-3 border-t border-terminal-border pt-3">
          {error && (
            <div className="font-mono text-[11px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-sm px-2 py-1">
              {error}
            </div>
          )}

          {/* Title + Overview row */}
          <div className="space-y-1">
            <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Research OAuth 2.0 PKCE flow"
              disabled={submitting}
              className="w-full bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1.5 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">Overview *</label>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="What should the bender accomplish?"
              rows={2}
              disabled={submitting}
              className="w-full bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1.5 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent resize-none"
            />
          </div>

          {/* Context (optional, collapsible) */}
          <details className="group">
            <summary className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider cursor-pointer hover:text-terminal-fg-secondary">
              Context &amp; References (optional)
            </summary>
            <div className="mt-2 space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">Context</label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Background info, links..."
                  rows={2}
                  disabled={submitting}
                  className="w-full bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1.5 font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent resize-none"
                />
              </div>
              <ListInput label="References" items={references} onChange={setReferences} placeholder="Add reference..." disabled={submitting} />
              <ListInput label="Constraints" items={constraints} onChange={setConstraints} placeholder="Add constraint..." disabled={submitting} />
            </div>
          </details>

          {/* Requirements + Criteria */}
          <ListInput label="Requirements *" items={requirements} onChange={setRequirements} placeholder="Add requirement..." disabled={submitting} />
          <ListInput label="Acceptance Criteria *" items={acceptanceCriteria} onChange={setAcceptanceCriteria} placeholder="Add criterion..." disabled={submitting} />

          {/* Priority + Branch + Submit */}
          <div className="flex items-end gap-3 pt-1">
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'normal' | 'focus')}
                disabled={submitting}
                className="bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-secondary focus:outline-none focus:border-user-accent"
              >
                <option value="normal">Normal</option>
                <option value="focus">Focus</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] text-terminal-fg-tertiary uppercase tracking-wider">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={submitting}
                className="w-24 bg-terminal-bg-base border border-terminal-border rounded-sm px-2 py-1 font-mono text-[11px] text-terminal-fg-secondary focus:outline-none focus:border-user-accent"
              />
            </div>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => { reset(); setOpen(false) }}
              className="font-mono text-[10px] px-2 py-1 text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="font-mono text-[10px] px-3 py-1 rounded-sm border border-user-accent text-user-accent hover:bg-user-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="h-3 w-3" />
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
