'use client'

import { formatRelativeDate } from '@/lib/client/formatters'
import type { InboxItem as InboxItemType } from '@/types/inbox'

interface InboxItemProps {
  item: InboxItemType
  onDelete?: (filename: string) => void
  deleting?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  note: 'text-blue-400 border-blue-400/30',
  link: 'text-cyan-400 border-cyan-400/30',
  file: 'text-amber-400 border-amber-400/30',
  instruction: 'text-purple-400 border-purple-400/30',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-terminal-fg-tertiary border-terminal-border',
  processing: 'text-amber-400 border-amber-400/30',
  done: 'text-green-400 border-green-400/30',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  normal: '',
  low: 'text-terminal-fg-tertiary',
}

export function InboxItemCard({ item, onDelete, deleting }: InboxItemProps) {
  const hasFile = item.fileSize && item.fileSize > 0

  return (
    <div className="group flex items-center gap-2 py-1 px-1 font-mono text-[11px] hover:bg-terminal-bg-elevated/50 rounded-sm transition-colors">
      {/* Priority indicator */}
      {item.priority && item.priority !== 'normal' && (
        <span className={`shrink-0 text-[9px] font-bold uppercase ${PRIORITY_COLORS[item.priority]}`}>
          {item.priority === 'critical' ? '!!' : item.priority === 'high' ? '!' : item.priority.charAt(0)}
        </span>
      )}

      {/* Type badge */}
      <span className={`shrink-0 text-[9px] px-1 py-0 border rounded ${TYPE_COLORS[item.type] ?? 'text-terminal-fg-tertiary border-terminal-border'}`}>
        {item.type}
      </span>

      {/* Title */}
      <span className="text-terminal-fg-primary truncate flex-1">
        {item.title}
      </span>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <span className="text-[9px] text-terminal-fg-tertiary truncate max-w-[80px]">
          {item.tags.slice(0, 2).join(', ')}
        </span>
      )}

      {/* Status badge */}
      <span className={`shrink-0 text-[9px] px-1 py-0 border rounded ${STATUS_COLORS[item.status] ?? ''}`}>
        {item.status}
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

      {/* Download button */}
      {hasFile && (
        <a
          href={`/api/inbox/${item.id}/download`}
          className="shrink-0 text-terminal-fg-tertiary hover:text-user-accent transition-colors opacity-0 group-hover:opacity-100"
          title={`Download (${formatFileSize(item.fileSize!)})`}
        >
          dl
        </a>
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
