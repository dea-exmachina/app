'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import type { InboxItemType, InboxCreateRequest } from '@/types/inbox'

const ITEM_TYPES: { value: InboxItemType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'link', label: 'Link' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'file', label: 'File' },
]

interface InboxComposerProps {
  onSubmit: (item: InboxCreateRequest) => Promise<unknown>
  submitting?: boolean
  compact?: boolean
}

export function InboxComposer({
  onSubmit,
  submitting = false,
  compact = false,
}: InboxComposerProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<InboxItemType>('note')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    await onSubmit({ title: title.trim(), content: content.trim(), type })
    setTitle('')
    setContent('')
    setType('note')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={submitting}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InboxItemType)}
          className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={submitting}
        >
          {ITEM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Drop something here..."
        rows={compact ? 2 : 4}
        className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        disabled={submitting}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={submitting || !title.trim() || !content.trim()}
          className="gap-1.5 font-mono text-xs"
        >
          <Send className="h-3.5 w-3.5" />
          {submitting ? 'Sending...' : 'Drop'}
        </Button>
      </div>
    </form>
  )
}
