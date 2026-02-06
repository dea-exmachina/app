'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { formatRelativeDate } from '@/lib/client/formatters'
import type { InboxItem as InboxItemType } from '@/types/inbox'

const TYPE_COLORS: Record<string, string> = {
  note: '#8B9DC3',
  link: '#6AACB8',
  instruction: '#C99A6B',
  file: '#9B8E7B',
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: '#C99A6B', label: 'Pending' },
  processing: { color: '#6AACB8', label: 'Processing' },
  done: { color: '#7DB87D', label: 'Done' },
}

interface InboxItemProps {
  item: InboxItemType
  onDelete?: (filename: string) => void
  deleting?: boolean
}

export function InboxItemCard({ item, onDelete, deleting }: InboxItemProps) {
  return (
    <div className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/30">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-sm font-medium text-foreground">
            {item.title}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 font-mono text-xs"
            style={{
              borderColor: TYPE_COLORS[item.type] ?? '#9B8E7B',
              color: TYPE_COLORS[item.type] ?? '#9B8E7B',
            }}
          >
            {item.type}
          </Badge>
          <Badge
            variant="outline"
            className="shrink-0 font-mono text-xs"
            style={{
              borderColor: STATUS_CONFIG[item.status]?.color ?? '#C99A6B',
              color: STATUS_CONFIG[item.status]?.color ?? '#C99A6B',
            }}
          >
            {STATUS_CONFIG[item.status]?.label ?? item.status}
          </Badge>
        </div>
        {item.content && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {item.content}
          </p>
        )}
        <div className="flex items-center gap-2">
          {item.created && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatRelativeDate(item.created)}
            </span>
          )}
          {item.source && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="font-mono text-xs text-muted-foreground">
                via {item.source}
              </span>
            </>
          )}
        </div>
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(item.filename)}
          disabled={deleting}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
    </div>
  )
}
