'use client'

import { useState } from 'react'
import type { InboxCreateRequest } from '@/types/inbox'

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
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      type: 'note',
    })
    setTitle('')
    setContent('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full text-left font-mono text-[10px] px-1 py-1 text-terminal-fg-tertiary hover:text-user-accent transition-colors border-b border-terminal-border"
      >
        + drop something...
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-b border-terminal-border pb-2">
      <div className="space-y-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title..."
          className="w-full bg-transparent font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border-b border-terminal-border px-1 py-1 outline-none focus:border-user-accent transition-colors"
          disabled={submitting}
          autoFocus
        />
        {!compact && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="content (optional)..."
            rows={2}
            className="w-full bg-transparent font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border border-terminal-border rounded-sm px-1 py-1 outline-none focus:border-user-accent transition-colors resize-none"
            disabled={submitting}
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              setTitle('')
              setContent('')
            }}
            className="font-mono text-[10px] px-2 py-0.5 text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-user-accent text-user-accent-fg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'dropping...' : 'drop'}
          </button>
        </div>
      </div>
    </form>
  )
}
