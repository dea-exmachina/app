'use client'

import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
import { formatRelativeDate } from '@/lib/client/formatters'
import type { InboxItem } from '@/types/inbox'

interface InboxPreviewProps {
  items: InboxItem[]
  maxItems?: number
}

export function InboxPreview({ items, maxItems = 4 }: InboxPreviewProps) {
  const pendingItems = items.filter((item) => item.status === 'pending')
  const visible = pendingItems.slice(0, maxItems)
  const remaining = pendingItems.length - visible.length

  return (
    <div>
      <SectionDivider
        label="Inbox"
        count={pendingItems.length > 0 ? `${pendingItems.length} pending` : undefined}
      />
      {visible.length === 0 ? (
        <p className="mt-2 font-mono text-[11px] text-terminal-fg-tertiary px-1">
          No pending items
        </p>
      ) : (
        <div className="mt-1 space-y-px">
          {visible.map((item) => (
            <div
              key={item.filename}
              className="flex items-center justify-between px-1 py-1 font-mono text-[11px] hover:bg-terminal-bg-elevated rounded-sm"
            >
              <span className="text-terminal-fg-primary truncate flex-1 mr-2">
                {item.title}
              </span>
              <span className="text-terminal-fg-tertiary shrink-0">
                {formatRelativeDate(item.created)}
              </span>
            </div>
          ))}
          {remaining > 0 && (
            <Link
              href="/inbox"
              className="block px-1 py-1 font-mono text-[11px] text-terminal-fg-tertiary hover:text-user-accent transition-colors"
            >
              +{remaining} more →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
