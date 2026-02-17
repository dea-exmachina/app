'use client'

import { InboxItemCard } from './InboxItem'
import { SectionDivider } from '@/components/ui/section-divider'
import type { InboxItem } from '@/types/inbox'

interface InboxListProps {
  items: InboxItem[]
  onDelete?: (filename: string) => void
  onUpdated?: () => void
  deleting?: boolean
}

export function InboxList({ items, onDelete, onUpdated, deleting }: InboxListProps) {
  const pendingItems = items.filter((i) => i.status === 'pending')
  const otherItems = items.filter((i) => i.status !== 'pending')

  return (
    <div>
      <SectionDivider
        label="Inbox"
        count={pendingItems.length > 0 ? `${pendingItems.length} pending` : `${items.length} items`}
      />

      {items.length === 0 ? (
        <div className="py-4 text-center font-mono text-[11px] text-terminal-fg-tertiary">
          Inbox is empty. Drop something in.
        </div>
      ) : (
        <div className="mt-1">
          {pendingItems.map((item) => (
            <InboxItemCard
              key={item.filename}
              item={item}
              onDelete={onDelete}
              onUpdated={onUpdated}
              deleting={deleting}
            />
          ))}
          {otherItems.length > 0 && pendingItems.length > 0 && (
            <div className="my-1 border-b border-terminal-border" />
          )}
          {otherItems.map((item) => (
            <InboxItemCard
              key={item.filename}
              item={item}
              onDelete={onDelete}
              onUpdated={onUpdated}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
