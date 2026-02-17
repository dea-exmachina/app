'use client'

import { useState, useEffect, useCallback } from 'react'
import { useProjectDashboardContext } from './ProjectDashboardProvider'
import { InboxItemCard } from '@/components/inbox/InboxItem'
import { InboxComposer } from '@/components/inbox/InboxComposer'
import { SectionDivider } from '@/components/ui/section-divider'
import type { InboxItem, InboxCreateRequest } from '@/types/inbox'

export function ProjectInboxWidget() {
  const { data } = useProjectDashboardContext()
  const projectId = data.project.id

  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)

  const fetchItems = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/inbox?project=${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load inbox')
        return res.json()
      })
      .then((json) => setItems(json.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleCreate = useCallback(
    async (item: InboxCreateRequest) => {
      setMutating(true)
      try {
        const res = await fetch('/api/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, projectId }),
        })
        if (!res.ok) throw new Error('Failed to create item')
        const json = await res.json()
        setItems((prev) => [json.data, ...prev])
      } finally {
        setMutating(false)
      }
    },
    [projectId]
  )

  const handleDelete = useCallback(async (filename: string) => {
    setMutating(true)
    try {
      const res = await fetch(`/api/inbox/${filename}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setItems((prev) => prev.filter((i) => i.filename !== filename))
    } finally {
      setMutating(false)
    }
  }, [])

  const pendingItems = items.filter((i) => i.status === 'pending')
  const otherItems = items.filter((i) => i.status !== 'pending')

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary p-2">
        Loading inbox...
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="font-mono text-[11px] text-status-error p-2">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-1">
      <InboxComposer onSubmit={handleCreate} submitting={mutating} compact />

      <SectionDivider
        label="Inbox"
        count={pendingItems.length > 0 ? `${pendingItems.length} pending` : `${items.length} items`}
      />

      {items.length === 0 ? (
        <div className="py-4 text-center font-mono text-[11px] text-terminal-fg-tertiary">
          No inbox items for this project.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {pendingItems.map((item) => (
            <InboxItemCard
              key={item.filename}
              item={item}
              onDelete={handleDelete}
              deleting={mutating}
            />
          ))}
          {otherItems.length > 0 && pendingItems.length > 0 && (
            <div className="my-1 border-b border-terminal-border" />
          )}
          {otherItems.map((item) => (
            <InboxItemCard
              key={item.filename}
              item={item}
              onDelete={handleDelete}
              deleting={mutating}
            />
          ))}
        </div>
      )}
    </div>
  )
}
