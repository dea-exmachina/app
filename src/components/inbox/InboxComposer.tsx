'use client'

import { useState, useRef, useCallback } from 'react'
import type { InboxCreateRequest, InboxItemType } from '@/types/inbox'

interface InboxComposerProps {
  onSubmit: (item: InboxCreateRequest) => Promise<unknown>
  submitting?: boolean
  compact?: boolean
}

const ITEM_TYPES: { value: InboxItemType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'link', label: 'Link' },
  { value: 'file', label: 'File' },
  { value: 'instruction', label: 'Instruction' },
]

export function InboxComposer({
  onSubmit,
  submitting = false,
  compact = false,
}: InboxComposerProps) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<InboxItemType>('note')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle('')
    setContent('')
    setType('note')
    setFileName(null)
    setExpanded(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      type,
    })
    reset()
  }

  const processFile = useCallback((file: File) => {
    setType('file')
    setFileName(file.name)
    if (!title) setTitle(file.name)

    const reader = new FileReader()
    if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
      reader.onload = () => setContent(reader.result as string)
      reader.readAsText(file)
    } else {
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setContent(base64)
      }
      reader.readAsDataURL(file)
    }
  }, [title])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setExpanded(true)
      processFile(file)
    }
  }, [processFile])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) processFile(file)
        return
      }
    }
    // Check for URL paste
    const text = e.clipboardData.getData('text')
    if (text && /^https?:\/\//.test(text.trim())) {
      setType('link')
    }
  }, [processFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  if (!expanded) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <button
          onClick={() => setExpanded(true)}
          className={`w-full text-left font-mono text-[10px] px-1 py-1 transition-colors border-b ${
            dragOver
              ? 'text-user-accent border-user-accent bg-user-accent/10'
              : 'text-terminal-fg-tertiary hover:text-user-accent border-terminal-border'
          }`}
        >
          {dragOver ? 'Drop file here...' : '+ drop something...'}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-b border-terminal-border pb-2 ${dragOver ? 'bg-user-accent/5' : ''}`}
    >
      <div className="space-y-1.5">
        {/* Type selector + Title row */}
        <div className="flex items-center gap-1.5">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as InboxItemType)}
            className="h-5 px-1 bg-terminal-bg-elevated border border-terminal-border rounded text-[10px] font-mono text-terminal-fg-primary focus:outline-none focus:border-user-accent"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title..."
            className="flex-1 bg-transparent font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border-b border-terminal-border px-1 py-0.5 outline-none focus:border-user-accent transition-colors"
            disabled={submitting}
            autoFocus
          />
        </div>

        {/* File preview */}
        {fileName && (
          <div className="flex items-center gap-1.5 px-1 py-0.5 bg-terminal-bg-elevated rounded text-[10px] font-mono">
            <span className="text-amber-400">F</span>
            <span className="text-terminal-fg-secondary truncate flex-1">{fileName}</span>
            <button
              type="button"
              onClick={() => { setFileName(null); setContent(''); setType('note') }}
              className="text-terminal-fg-tertiary hover:text-status-error"
            >
              x
            </button>
          </div>
        )}

        {/* Content area */}
        {!compact && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'link' ? 'Paste URL...' : 'content (optional)...'}
            rows={2}
            className="w-full bg-transparent font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border border-terminal-border rounded-sm px-1 py-1 outline-none focus:border-user-accent transition-colors resize-none"
            disabled={submitting}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-[10px] px-1.5 py-0.5 text-terminal-fg-tertiary hover:text-terminal-fg-secondary border border-terminal-border rounded transition-colors"
            title="Attach file"
          >
            attach
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={reset}
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
