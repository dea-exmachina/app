'use client'

import { useState, useEffect, useCallback } from 'react'
import { SectionDivider } from '@/components/ui/section-divider'

interface Tweet {
  id: string
  text: string
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function XPostWidget() {
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postSuccess, setPostSuccess] = useState(false)

  const [tweets, setTweets] = useState<Tweet[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)

  const charCount = text.length
  const overLimit = charCount > 280

  const fetchFeed = useCallback(() => {
    setFeedLoading(true)
    setFeedError(null)
    fetch('/api/x/feed')
      .then((r) => r.json())
      .then((json: { tweets?: Tweet[]; error?: { message: string } }) => {
        if (json.error) {
          setFeedError(json.error.message)
        } else {
          setTweets(json.tweets ?? [])
        }
      })
      .catch(() => setFeedError('Failed to load tweets'))
      .finally(() => setFeedLoading(false))
  }, [])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  const handlePost = useCallback(async () => {
    if (!text.trim() || overLimit || posting) return

    setPosting(true)
    setPostError(null)
    setPostSuccess(false)

    try {
      const response = await fetch('/api/x/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json = await response.json() as { id?: string; error?: { message: string } }

      if (!response.ok || json.error) {
        setPostError(json.error?.message ?? 'Failed to post tweet')
      } else {
        setText('')
        setPostSuccess(true)
        // Refresh feed after successful post
        setTimeout(() => {
          setPostSuccess(false)
          fetchFeed()
        }, 1500)
      }
    } catch {
      setPostError('Network error — could not post tweet')
    } finally {
      setPosting(false)
    }
  }, [text, overLimit, posting, fetchFeed])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handlePost()
    }
  }

  return (
    <div className="flex h-full flex-col gap-1">
      {/* Compose section */}
      <SectionDivider label="X / Twitter" />

      <div className="flex flex-col gap-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's happening?"
          disabled={posting}
          rows={3}
          className={`w-full resize-none rounded-sm border bg-terminal-bg-elevated font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary px-2 py-1.5 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
            overLimit
              ? 'border-status-error focus:ring-status-error'
              : 'border-terminal-border focus:ring-user-accent'
          }`}
        />

        <div className="flex items-center justify-between">
          {/* Character counter */}
          <span
            className={`font-mono text-[10px] ${
              overLimit
                ? 'text-status-error'
                : charCount > 250
                  ? 'text-status-warn'
                  : 'text-terminal-fg-tertiary'
            }`}
          >
            {charCount}/280
          </span>

          {/* Status messages */}
          <div className="flex-1 px-2">
            {postError && (
              <span className="font-mono text-[10px] text-status-error">{postError}</span>
            )}
            {postSuccess && (
              <span className="font-mono text-[10px] text-status-ok">Posted!</span>
            )}
          </div>

          {/* Post button */}
          <button
            onClick={handlePost}
            disabled={!text.trim() || overLimit || posting}
            className="font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors disabled:pointer-events-none disabled:opacity-40 border-user-accent text-user-accent hover:bg-user-accent/10 disabled:border-terminal-border disabled:text-terminal-fg-tertiary"
          >
            {posting ? '...' : 'Post'}
          </button>
        </div>

        <div className="font-mono text-[9px] text-terminal-fg-tertiary">
          ⌘↵ to post
        </div>
      </div>

      {/* Feed section */}
      <SectionDivider label="Recent" count={tweets.length} />

      {feedLoading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary p-1">Loading...</div>
      ) : feedError ? (
        <div className="font-mono text-[10px] text-status-error p-1">{feedError}</div>
      ) : tweets.length === 0 ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary p-1">No tweets yet.</div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto space-y-0">
          {tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="flex flex-col gap-0.5 py-1.5 px-1 border-b border-terminal-border/50 last:border-0"
            >
              <span className="font-mono text-[11px] text-terminal-fg-primary leading-tight">
                {tweet.text}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://x.com/i/web/status/${tweet.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[9px] text-terminal-fg-tertiary hover:text-user-accent transition-colors"
                >
                  {timeAgo(tweet.created_at)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
