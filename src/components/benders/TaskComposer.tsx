'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Send, Plus, X } from 'lucide-react'
import { createTask } from '@/lib/client/api'
import type { BenderTaskCreateRequest } from '@/types/bender'

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

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="block font-mono text-xs text-muted-foreground">
        {label}
      </label>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-1.5 font-mono text-sm text-foreground">
            {item}
          </span>
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={disabled}
            className="mt-1 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="gap-1 font-mono text-xs"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  )
}

export function TaskComposer() {
  const router = useRouter()
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

  const canSubmit =
    title.trim() &&
    overview.trim() &&
    requirements.length > 0 &&
    acceptanceCriteria.length > 0

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
      router.push(`/benders/tasks/${data.taskId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 font-mono text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-muted-foreground">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Research OAuth 2.0 PKCE flow"
          disabled={submitting}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Overview */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-muted-foreground">
          Overview *
        </label>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          placeholder="What should the bender accomplish?"
          rows={3}
          disabled={submitting}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Context (optional) */}
      <div className="space-y-2">
        <label className="block font-mono text-xs text-muted-foreground">
          Context
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Background info, links to related work..."
          rows={2}
          disabled={submitting}
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Requirements */}
      <ListInput
        label="Requirements *"
        items={requirements}
        onChange={setRequirements}
        placeholder="Add a requirement..."
        disabled={submitting}
      />

      {/* Acceptance Criteria */}
      <ListInput
        label="Acceptance Criteria *"
        items={acceptanceCriteria}
        onChange={setAcceptanceCriteria}
        placeholder="Add an acceptance criterion..."
        disabled={submitting}
      />

      {/* References (optional) */}
      <ListInput
        label="References"
        items={references}
        onChange={setReferences}
        placeholder="Add a reference file or link..."
        disabled={submitting}
      />

      {/* Constraints (optional) */}
      <ListInput
        label="Constraints"
        items={constraints}
        onChange={setConstraints}
        placeholder="Add a constraint..."
        disabled={submitting}
      />

      {/* Priority + Branch */}
      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <label className="block font-mono text-xs text-muted-foreground">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'normal' | 'focus')}
            disabled={submitting}
            className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="normal">Normal</option>
            <option value="focus">Focus</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block font-mono text-xs text-muted-foreground">
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={submitting}
            className="w-32 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={submitting || !canSubmit}
          className="gap-1.5 font-mono text-xs"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}
