'use client'

import { useState, useEffect } from 'react'
import { InboxComposer } from '@/components/inbox/InboxComposer'
import { InboxList } from '@/components/inbox/InboxList'
import { useInbox } from '@/hooks/useInbox'

interface ProjectOption {
  id: string
  slug: string
  name: string
}

export function InboxWidget() {
  const { data: items, loading, error, mutating, create, remove } = useInbox()
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectFilter, setProjectFilter] = useState<string>('')

  // Fetch projects for dropdown
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setProjects(
            json.data.map((p: { id: string; slug: string; name: string }) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  // Filter items by project
  const filtered = projectFilter
    ? (items ?? []).filter(item => item.projectId === projectFilter)
    : (items ?? [])

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading inbox...
      </div>
    )
  }

  if (error && !items) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load inbox: {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Project filter bar */}
      <div className="flex items-center gap-2 font-mono text-[10px]">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-5 px-1 bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary text-[10px] font-mono focus:outline-none focus:border-user-accent"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-terminal-fg-tertiary ml-auto">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <InboxComposer onSubmit={create} submitting={mutating} compact />
      <div className="min-h-0 flex-1 overflow-auto">
        <InboxList
          items={filtered}
          onDelete={remove}
          deleting={mutating}
        />
      </div>
    </div>
  )
}
