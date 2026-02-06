'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { InboxComposer } from '@/components/inbox/InboxComposer'
import { InboxList } from '@/components/inbox/InboxList'
import { useInbox } from '@/hooks/useInbox'
import { Separator } from '@/components/ui/separator'

export function InboxWidget() {
  const { data: items, loading, error, mutating, create, remove } = useInbox()

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    )
  }

  if (error && !items) {
    return (
      <div className="text-sm text-destructive">
        Failed to load inbox: {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <InboxComposer
        onSubmit={create}
        submitting={mutating}
        compact
      />
      <Separator />
      <div className="min-h-0 flex-1">
        <InboxList
          items={items ?? []}
          onDelete={remove}
          deleting={mutating}
        />
      </div>
    </div>
  )
}
