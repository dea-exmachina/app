'use client'

import { formatRelativeDate } from '@/lib/client/formatters'
import type { InboxItem as InboxItemType } from '@/types/inbox'

interface InboxItemProps {
  item: InboxItemType
  onDelete?: (filename: string) => void
  deleting?: boolean
}

export function InboxItemCard({ item, onDelete, deleting }: InboxItemProps) {
  return (
    <div className="group flex items-center gap-2 py-1 px-1 font-mono text-[11px] hover:bg-terminal-bg-elevated/50 rounded-sm transition-colors">
      {/* Title */}
      <span className="text-terminal-fg-primary truncate flex-1">
        {item.title}
      </span>

      {/* Source */}
      <span className="text-terminal-fg-tertiary shrink-0">
        {item.source}
      </span>

      {/* Age */}
      {item.created && (
        <span className="text-terminal-fg-tertiary shrink-0 w-12 text-right">
          {formatRelativeDate(item.created)}
        </span>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(item.filename)}
          disabled={deleting}
          className="shrink-0 text-terminal-fg-tertiary hover:text-status-error transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          aria-label="Delete item"
        >
          x
        </button>
      )}
    </div>
  )
}
