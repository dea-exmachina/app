'use client'

import { InboxComposer } from '@/components/inbox/InboxComposer'
import { InboxList } from '@/components/inbox/InboxList'
import { useInbox } from '@/hooks/useInbox'

export function InboxWidget() {
  const { data: items, loading, error, mutating, create, remove } = useInbox()

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
      <InboxComposer onSubmit={create} submitting={mutating} compact />
      <div className="min-h-0 flex-1 overflow-auto">
        <InboxList
          items={items ?? []}
          onDelete={remove}
          deleting={mutating}
        />
      </div>
    </div>
  )
}
