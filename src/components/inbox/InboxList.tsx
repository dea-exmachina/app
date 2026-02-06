'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { InboxItemCard } from './InboxItem'
import type { InboxItem } from '@/types/inbox'

interface InboxListProps {
  items: InboxItem[]
  onDelete?: (filename: string) => void
  deleting?: boolean
}

export function InboxList({ items, onDelete, deleting }: InboxListProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center font-mono text-sm text-muted-foreground">
        Inbox is empty. Drop something in.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2">
        {items.map((item) => (
          <InboxItemCard
            key={item.filename}
            item={item}
            onDelete={onDelete}
            deleting={deleting}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
