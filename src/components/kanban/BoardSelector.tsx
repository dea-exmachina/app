'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
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
      <div className="mb-2 flex items-center gap-3">
        <SectionDivider label="Boards" count={`${boards.length} total`} />
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search boards..."
          className="w-full max-w-xs bg-transparent font-mono text-[11px] text-terminal-fg-primary placeholder:text-terminal-fg-tertiary border-b border-terminal-border px-1 py-1 outline-none focus:border-user-accent transition-colors"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-fg-tertiary">
              <th className="pb-1.5 pr-4 text-left font-semibold uppercase tracking-wider">
                Board
              </th>
              <th className="pb-1.5 px-2 text-right font-semibold uppercase tracking-wider w-14">
                Open
              </th>
              <th className="pb-1.5 px-2 text-right font-semibold uppercase tracking-wider w-14">
                Done
              </th>
              <th className="pb-1.5 pl-4 text-left font-semibold uppercase tracking-wider">
                Lanes
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((board) => {
              const laneText = board.laneStats
                .filter((l) => l.total - l.completed > 0)
                .map((l) => `${l.name}(${l.total - l.completed})`)
                .join(' ')

              return (
                <tr key={board.id} className="group">
                  <td className="py-1.5 pr-4">
                    <Link
                      href={`/kanban/${board.id}`}
                      className="text-terminal-fg-primary group-hover:text-user-accent transition-colors"
                    >
                      {board.name}
                    </Link>
                  </td>
                  <td className="py-1.5 px-2 text-right text-terminal-fg-primary">
                    {board.totalOpen}
                  </td>
                  <td className="py-1.5 px-2 text-right text-terminal-fg-secondary">
                    {board.totalCompleted}
                  </td>
                  <td className="py-1.5 pl-4 text-terminal-fg-tertiary truncate max-w-[300px]">
                    {laneText || '--'}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-terminal-fg-tertiary"
                >
                  {search ? 'No matching boards' : 'No boards found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
