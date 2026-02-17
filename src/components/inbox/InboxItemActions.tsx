'use client'

import { useState, useEffect, useRef } from 'react'
import type { InboxItem } from '@/types/inbox'
import { searchCards, updateInboxItem } from '@/lib/client/api'
import type { CardSearchResult } from '@/lib/client/api'

interface InboxItemActionsProps {
  item: InboxItem
  onUpdated: () => void
}

export function InboxItemActions({ item, onUpdated }: InboxItemActionsProps) {
  const [showActions, setShowActions] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CardSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Debounced card search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchCards(query, 5)
        setResults(res.data)
      } catch {
        // silently fail
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleLink = async (cardId: string) => {
    try {
      await updateInboxItem(item.filename, { linkedCardId: cardId })
      setShowSearch(false)
      setShowActions(false)
      onUpdated()
    } catch {
      // silently fail
    }
  }

  const handleDismiss = async () => {
    try {
      await updateInboxItem(item.filename, { status: 'done' })
      setShowActions(false)
      onUpdated()
    } catch {
      // silently fail
    }
  }

  const handleUnlink = async () => {
    try {
      await updateInboxItem(item.filename, { linkedCardId: null })
      setShowActions(false)
      onUpdated()
    } catch {
      // silently fail
    }
  }

  if (!showActions) {
    return (
      <button
        onClick={() => setShowActions(true)}
        className="shrink-0 text-[9px] font-mono text-terminal-fg-tertiary hover:text-user-accent transition-colors opacity-0 group-hover:opacity-100"
        title="Actions"
      >
        ...
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Link to card */}
      {!item.linkedCardId && (
        <button
          onClick={() => { setShowSearch(!showSearch); setTimeout(() => searchRef.current?.focus(), 50) }}
          className="text-[9px] font-mono px-1 py-0 border border-terminal-border rounded text-terminal-fg-secondary hover:border-user-accent transition-colors"
          title="Link to card"
        >
          link
        </button>
      )}

      {/* Unlink */}
      {item.linkedCardId && (
        <button
          onClick={handleUnlink}
          className="text-[9px] font-mono px-1 py-0 border border-terminal-border rounded text-terminal-fg-secondary hover:border-amber-400 transition-colors"
          title="Unlink card"
        >
          unlink
        </button>
      )}

      {/* Dismiss (archive) */}
      {item.status !== 'done' && (
        <button
          onClick={handleDismiss}
          className="text-[9px] font-mono px-1 py-0 border border-terminal-border rounded text-terminal-fg-secondary hover:border-green-400 transition-colors"
          title="Dismiss"
        >
          dismiss
        </button>
      )}

      {/* Close */}
      <button
        onClick={() => { setShowActions(false); setShowSearch(false) }}
        className="text-[9px] font-mono text-terminal-fg-tertiary hover:text-terminal-fg-primary"
      >
        x
      </button>

      {/* Search popover */}
      {showSearch && (
        <div className="absolute right-0 top-full mt-1 z-10 w-64 bg-terminal-bg-surface border border-terminal-border rounded shadow-lg p-1.5">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full px-1.5 py-1 text-[10px] font-mono bg-terminal-bg-elevated border border-terminal-border rounded text-terminal-fg-primary placeholder:text-terminal-fg-tertiary focus:outline-none focus:border-user-accent"
          />
          <div className="mt-1 max-h-32 overflow-auto">
            {searching && (
              <div className="text-[9px] font-mono text-terminal-fg-tertiary px-1 py-0.5">Searching...</div>
            )}
            {!searching && results.length === 0 && query.trim() && (
              <div className="text-[9px] font-mono text-terminal-fg-tertiary px-1 py-0.5">No results</div>
            )}
            {results.map((card) => (
              <button
                key={card.cardId}
                onClick={() => handleLink(card.cardId)}
                className="w-full text-left px-1.5 py-1 text-[10px] font-mono rounded hover:bg-terminal-bg-elevated transition-colors"
              >
                <span className="text-user-accent">{card.cardId}</span>
                <span className="text-terminal-fg-primary ml-1.5">{card.title}</span>
                <span className="text-terminal-fg-tertiary ml-1">({card.lane})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
