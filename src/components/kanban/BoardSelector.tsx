'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
import { InlineProgressBar } from '@/components/ui/sparkline'
import type { BoardSummary } from '@/types/kanban'

interface BoardSelectorProps {
  boards: BoardSummary[]
}

export function BoardSelector({ boards }: BoardSelectorProps) {
  const [search, setSearch] = useState('')

  const filtered = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionDivider label="Boards" count={`${boards.length} total`} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search boards..."
          className="w-full max-w-xs bg-transparent font-mono text-[12px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border-b border-terminal-border px-1 py-1 outline-none focus:border-user-accent transition-colors"
        />
      </div>

      {/* Board cards */}
      <div className="space-y-2">
        {filtered.map((board) => {
          const total = board.totalOpen + board.totalCompleted
          const pct = total > 0 ? Math.round((board.totalCompleted / total) * 100) : 0
          const openLanes = board.laneStats.filter((l) => l.total - l.completed > 0)

          return (
            <Link
              key={board.id}
              href={`/kanban/${board.id}`}
              className="block rounded-sm border border-terminal-border p-3 hover:border-terminal-border-strong transition-colors group"
            >
              {/* Row 1: Name + progress */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[13px] font-semibold text-terminal-fg-primary group-hover:text-user-accent transition-colors">
                  {board.name}
                </span>
                <div className="flex items-center gap-3">
                  <InlineProgressBar
                    value={pct}
                    max={100}
                    width={80}
                    height={6}
                  />
                  <span className="font-mono text-[11px] text-terminal-fg-secondary w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Row 2: Stats */}
              <div className="flex items-center gap-4 mb-1.5 font-mono text-[11px]">
                <span>
                  <span className="text-terminal-fg-tertiary">open </span>
                  <span className="text-terminal-fg-primary font-semibold">{board.totalOpen}</span>
                </span>
                <span>
                  <span className="text-terminal-fg-tertiary">done </span>
                  <span className="text-terminal-fg-secondary">{board.totalCompleted}</span>
                </span>
                <span>
                  <span className="text-terminal-fg-tertiary">lanes </span>
                  <span className="text-terminal-fg-secondary">{board.laneStats.length}</span>
                </span>
              </div>

              {/* Row 3: Lane breakdown chips */}
              {openLanes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {openLanes.map((lane) => (
                    <span
                      key={lane.name}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-terminal-bg-elevated text-terminal-fg-secondary"
                    >
                      {lane.name}
                      <span className="text-terminal-fg-tertiary ml-1">
                        {lane.total - lane.completed}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-4 text-center font-mono text-[12px] text-terminal-fg-tertiary">
            {search ? 'No matching boards' : 'No boards found'}
          </div>
        )}
      </div>
    </div>
  )
}
