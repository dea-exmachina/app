'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import { getProjectWorkflows, createProjectWorkflow, deleteProjectWorkflow } from '@/lib/client/api'
import type { ProjectWorkflow } from '@/types/techstack'

export function ProjectWorkflowsWidget() {
  const { data } = useProjectDashboardContext()
  const slug = data.project.slug
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEvent, setTriggerEvent] = useState('')
  const [automated, setAutomated] = useState(false)

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await getProjectWorkflows(slug)
      setWorkflows(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchWorkflows() }, [fetchWorkflows])

  const handleAdd = async () => {
    const trimName = name.trim()
    if (!trimName) return
    try {
      await createProjectWorkflow(slug, {
        name: trimName,
        description: description.trim() || undefined,
        triggerEvent: triggerEvent.trim() || undefined,
        automated,
      })
      setName('')
      setDescription('')
      setTriggerEvent('')
      setAutomated(false)
      setShowForm(false)
      fetchWorkflows()
    } catch {
      // silently fail
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProjectWorkflow(slug, id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto space-y-1">
        {workflows.length === 0 && !showForm ? (
          <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
            No workflows configured
          </div>
        ) : (
          workflows.map((wf) => (
            <div
              key={wf.id}
              className="group px-2 py-1.5 rounded hover:bg-terminal-bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs shrink-0">
                  {wf.automated ? (
                    <span className="text-green-400" title="Automated">A</span>
                  ) : (
                    <span className="text-terminal-fg-tertiary" title="Manual">M</span>
                  )}
                </span>
                <span className="flex-1 min-w-0 text-xs font-mono text-terminal-fg-primary truncate">
                  {wf.name}
                </span>
                {wf.triggerEvent && (
                  <span className="text-[10px] font-mono text-terminal-fg-secondary px-1 py-0.5 bg-terminal-bg-elevated rounded">
                    {wf.triggerEvent}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(wf.id)}
                  className="shrink-0 text-xs text-terminal-fg-tertiary hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  x
                </button>
              </div>
              {wf.description && (
                <div className="text-[10px] font-mono text-terminal-fg-secondary mt-0.5 pl-5 truncate">
                  {wf.description}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      {showForm ? (
        <div className="border-t border-terminal-border pt-2 mt-2 space-y-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name (required)"
            className="w-full px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
            autoFocus
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
          />
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              placeholder="Trigger event"
              className="flex-1 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <label className="flex items-center gap-1 text-xs font-mono text-terminal-fg-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={automated}
                onChange={(e) => setAutomated(e.target.checked)}
                className="accent-user-accent"
              />
              Auto
            </label>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!name.trim()}
              className="flex-1 px-2 py-1 text-xs font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary hover:border-user-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-2 py-1 text-xs font-mono text-terminal-fg-tertiary hover:text-terminal-fg-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-terminal-border pt-2 mt-2">
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-2 py-1 text-xs font-mono text-terminal-fg-tertiary hover:text-terminal-fg-primary hover:bg-terminal-bg-elevated rounded transition-colors"
          >
            + Add workflow
          </button>
        </div>
      )}
    </div>
  )
}
