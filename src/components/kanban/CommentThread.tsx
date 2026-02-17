'use client'

import { useState, useRef, useEffect } from 'react'
import type { NexusComment, CommentType } from '@/types/nexus'
import { useCommentsRealtime } from '@/hooks/useCommentsRealtime'
import { Badge } from '@/components/ui/badge'
import { TerminalTextarea } from '@/components/ui/terminal-input'
import { SectionDivider } from '@/components/ui/section-divider'

// ── Author colors ──────────────────────────────────────

const AUTHOR_COLORS: Record<string, string> = {
  user: 'text-user-accent',
  dea: 'text-blue-400',
}

function authorColor(author: string): string {
  if (AUTHOR_COLORS[author]) return AUTHOR_COLORS[author]
  if (author.startsWith('bender')) return 'text-purple-400'
  return 'text-terminal-fg-secondary'
}

function authorBgColor(author: string): string {
  if (author === 'user') return 'bg-user-accent/10'
  if (author === 'dea') return 'bg-blue-400/10'
  if (author.startsWith('bender')) return 'bg-purple-400/10'
  return 'bg-terminal-bg-elevated'
}

// ── Type badge colors ──────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  note: '',
  question: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  directive: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  delivery: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  review: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  rejection: 'bg-red-500/15 text-red-400 border-red-500/30',
  pivot: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

// ── Relative time ──────────────────────────────────────

function relativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const diffMs = Date.now() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)
    if (diffM < 1) return 'just now'
    if (diffM < 60) return `${diffM}m ago`
    if (diffH < 24) return `${diffH}h ago`
    return `${diffD}d ago`
  } catch {
    return ''
  }
}

// ── Comment types for composer ──────────────────────────

const COMMENT_TYPES: { value: CommentType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'question', label: 'Question' },
  { value: 'directive', label: 'Directive' },
  { value: 'review', label: 'Review' },
  { value: 'rejection', label: 'Rejection' },
]

// ── CommentItem ────────────────────────────────────────

function CommentItem({
  comment,
  onResolve,
  onEdit,
  onDelete,
}: {
  comment: NexusComment
  onResolve?: (id: string) => void
  onEdit?: (id: string, content: string) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const isUserComment = comment.author === 'user'

  const handleSaveEdit = async () => {
    if (!editContent.trim() || saving || !onEdit) return
    setSaving(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    await onDelete(comment.id)
  }

  return (
    <div className={`rounded-sm border border-terminal-border p-2 space-y-1 ${
      comment.resolved ? 'opacity-50' : ''
    }`}>
      {/* Header: author + type + time + actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`font-mono text-[10px] font-semibold ${authorColor(comment.author)} ${authorBgColor(comment.author)} px-1 rounded-sm`}>
          {comment.author}
        </span>
        {comment.comment_type !== 'note' && (
          <Badge
            variant="terminal"
            className={TYPE_COLORS[comment.comment_type] || ''}
          >
            {comment.comment_type}
          </Badge>
        )}
        {comment.is_pivot && (
          <Badge variant="terminal" className={TYPE_COLORS.pivot}>
            PIVOT{comment.pivot_impact ? `/${comment.pivot_impact}` : ''}
          </Badge>
        )}
        <span className="flex-1" />
        <span className="font-mono text-[9px] text-terminal-fg-tertiary">
          {relativeTime(comment.created_at)}
        </span>
        {!comment.resolved && onResolve && (
          <button
            onClick={() => onResolve(comment.id)}
            className="font-mono text-[9px] text-terminal-fg-tertiary hover:text-user-accent transition-colors px-1"
            title="Mark as resolved"
          >
            resolve
          </button>
        )}
        {isUserComment && !editing && (
          <>
            <button
              onClick={() => { setEditing(true); setEditContent(comment.content) }}
              className="font-mono text-[9px] text-terminal-fg-tertiary hover:text-user-accent transition-colors px-1"
              title="Edit comment"
            >
              edit
            </button>
            <button
              onClick={handleDelete}
              className="font-mono text-[9px] text-terminal-fg-tertiary hover:text-red-400 transition-colors px-1"
              title="Delete comment"
            >
              del
            </button>
          </>
        )}
        {comment.resolved && (
          <span className="font-mono text-[9px] text-terminal-fg-tertiary">
            resolved
          </span>
        )}
      </div>

      {/* Content or edit mode */}
      {editing ? (
        <div className="space-y-1">
          <TerminalTextarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSaveEdit()
              }
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={!editContent.trim() || saving}
              className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-secondary hover:text-user-accent hover:border-user-accent transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="font-mono text-[9px] px-1.5 py-0.5 text-terminal-fg-tertiary hover:text-terminal-fg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="font-mono text-[11px] text-terminal-fg-primary leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
      )}
    </div>
  )
}

// ── CommentComposer ────────────────────────────────────

function CommentComposer({
  onSubmit,
  disabled,
}: {
  onSubmit: (content: string, type: CommentType) => Promise<void>
  disabled?: boolean
}) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<CommentType>('note')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(content.trim(), type)
      setContent('')
      setType('note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-1.5">
      <TerminalTextarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment..."
        rows={2}
        disabled={disabled || submitting}
      />
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CommentType)}
          className="bg-terminal-bg-base border border-terminal-border rounded-sm px-1.5 py-0.5 font-mono text-[10px] text-terminal-fg-secondary focus:outline-none focus:border-user-accent"
          disabled={disabled || submitting}
        >
          {COMMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <span className="flex-1" />
        <span className="font-mono text-[9px] text-terminal-fg-tertiary">
          Ctrl+Enter to send
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-secondary hover:text-user-accent hover:border-user-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ── CommentThread (main export) ────────────────────────

interface CommentThreadProps {
  cardId: string  // Display ID (e.g., "DEA-042")
}

export function CommentThread({ cardId }: CommentThreadProps) {
  const {
    comments,
    loading,
    error,
    isLive,
    postComment,
    resolveComment,
    editComment,
    deleteComment,
  } = useCommentsRealtime({ cardId })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<'discussion' | 'all' | 'system'>('discussion')

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  // Filter comments based on selected view
  const filteredComments = comments.filter((c) => {
    if (filter === 'all') return true
    if (filter === 'system') return c.comment_type === 'system'
    // 'discussion' = hide system comments
    return c.comment_type !== 'system'
  })

  const systemCount = comments.filter((c) => c.comment_type === 'system').length
  const unresolvedCount = filteredComments.filter((c) => !c.resolved).length

  return (
    <div>
      <SectionDivider
        label="Comments"
        count={comments.length || undefined}
        right={isLive ? 'LIVE' : undefined}
      />

      {loading && comments.length === 0 ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary py-2">
          Loading comments...
        </div>
      ) : error && comments.length === 0 ? (
        <div className="font-mono text-[11px] text-red-400 py-2">
          {error}
        </div>
      ) : (
        <>
          {/* Filter toggle */}
          <div className="flex items-center gap-1 py-1">
            {(['discussion', 'all', 'system'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[9px] px-1.5 py-0.5 rounded-sm border transition-colors ${
                  filter === f
                    ? 'border-user-accent text-user-accent'
                    : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
                }`}
              >
                {f === 'discussion' ? 'Discussion' : f === 'all' ? 'All' : `System (${systemCount})`}
              </button>
            ))}
          </div>

          {/* Unresolved indicator */}
          {unresolvedCount > 0 && (
            <div className="font-mono text-[10px] text-amber-400 py-1">
              {unresolvedCount} unresolved
            </div>
          )}

          {/* Comment list */}
          <div
            ref={scrollRef}
            className="mt-1.5 space-y-1.5 max-h-[400px] overflow-y-auto"
          >
            {filteredComments.length === 0 ? (
              <div className="font-mono text-[11px] text-terminal-fg-tertiary py-2">
                {filter === 'system' ? 'No system messages' : 'No comments yet'}
              </div>
            ) : (
              filteredComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onResolve={resolveComment}
                  onEdit={editComment}
                  onDelete={deleteComment}
                />
              ))
            )}
          </div>

          {/* Composer */}
          <div className="mt-2">
            <CommentComposer onSubmit={postComment} />
          </div>
        </>
      )}
    </div>
  )
}
