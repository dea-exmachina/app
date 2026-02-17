'use client'

import { useState, useMemo, useCallback } from 'react'
import { Flag, ArrowUp, ArrowDown } from 'lucide-react'
import type { KanbanBoard, KanbanCard } from '@/types/kanban'
import { CardBadge } from './CardBadge'
import { CardDetailPanel } from './CardDetailPanel'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { formatDateTime } from '@/lib/client/formatters'

// ── Types ──────────────────────────────────────────

type SortKey = 'id' | 'title' | 'lane' | 'priority' | 'type' | 'assignee' | 'created' | 'status'
type SortDir = 'asc' | 'desc'

interface FlatCard {
  card: KanbanCard
  lane: string
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

const LANE_ORDER: Record<string, number> = {
  'In Progress': 0,
  'Review': 1,
  'Ready': 2,
  'Backlog': 3,
  'Done': 4,
}

// ── Helpers ────────────────────────────────────────

function cardStatus(card: KanbanCard): string {
  if (card.completed) return 'done'
  if (card.startedAt) return 'in-progress'
  return 'pending'
}

function getSortValue(item: FlatCard, key: SortKey): string | number {
  const { card, lane } = item
  switch (key) {
    case 'id': return card.id
    case 'title': return card.title.toLowerCase()
    case 'lane': return LANE_ORDER[lane] ?? 99
    case 'priority': return PRIORITY_ORDER[card.metadata?.Priority?.toLowerCase() ?? 'normal'] ?? 2
    case 'type': return card.metadata?.Type ?? ''
    case 'assignee': return card.metadata?.Assignee ?? card.metadata?.assignee ?? ''
    case 'created': return new Date(card.createdAt).getTime()
    case 'status': return cardStatus(card)
  }
}

// ── Component ──────────────────────────────────────

interface TableViewProps {
  board: KanbanBoard
}

export function TableView({ board }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('lane')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedCard, setSelectedCard] = useState<FlatCard | null>(null)

  // Flatten all lanes into a single list
  const allCards = useMemo<FlatCard[]>(() => {
    const items: FlatCard[] = []
    for (const lane of board.lanes) {
      for (const card of lane.cards) {
        items.push({ card, lane: lane.name })
      }
    }
    return items
  }, [board.lanes])

  // Sort
  const sorted = useMemo(() => {
    return [...allCards].sort((a, b) => {
      const va = getSortValue(a, sortKey)
      const vb = getSortValue(b, sortKey)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [allCards, sortKey, sortDir])

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }, [sortKey])

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'id', label: 'ID', className: 'w-[90px]' },
    { key: 'title', label: 'Title' },
    { key: 'lane', label: 'Lane', className: 'w-[100px]' },
    { key: 'priority', label: 'Pri', className: 'w-[60px]' },
    { key: 'type', label: 'Type', className: 'w-[70px]' },
    { key: 'assignee', label: 'Assignee', className: 'w-[90px]' },
    { key: 'created', label: 'Created', className: 'w-[100px]' },
    { key: 'status', label: '', className: 'w-[30px]' },
  ]

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-terminal-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-left py-1.5 px-2 text-terminal-fg-tertiary uppercase tracking-wider cursor-pointer hover:text-terminal-fg-secondary transition-colors select-none ${col.className ?? ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => {
              const { card, lane } = item
              const status = cardStatus(card)
              const assignee = card.metadata?.Assignee || card.metadata?.assignee || ''
              const priority = card.metadata?.Priority ?? ''
              const type = card.metadata?.Type ?? ''

              return (
                <tr
                  key={card.id}
                  onClick={() => setSelectedCard(item)}
                  className={`border-b border-terminal-border/50 cursor-pointer transition-colors hover:bg-terminal-hl/10 ${
                    card.completed ? 'opacity-50' : ''
                  }`}
                >
                  <td className="py-1.5 px-2">
                    <span className="text-user-accent font-semibold">{card.id}</span>
                    {card.readyForProduction && (
                      <Flag className="inline h-3 w-3 text-status-ok ml-1" />
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-terminal-fg-primary truncate max-w-[300px]">
                    {card.title}
                    {card.tags.length > 0 && (
                      <span className="ml-2 inline-flex gap-1">
                        {card.tags.slice(0, 2).map(tag => (
                          <CardBadge key={tag} tag={tag} />
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-terminal-fg-secondary">{lane}</td>
                  <td className={`py-1.5 px-2 ${
                    priority === 'critical' ? 'text-red-400' :
                    priority === 'high' ? 'text-amber-400' :
                    'text-terminal-fg-tertiary'
                  }`}>{priority}</td>
                  <td className="py-1.5 px-2 text-terminal-fg-tertiary">{type}</td>
                  <td className="py-1.5 px-2 text-terminal-fg-secondary">{assignee}</td>
                  <td className="py-1.5 px-2 text-terminal-fg-tertiary">{formatDateTime(card.createdAt)}</td>
                  <td className="py-1.5 px-2">
                    <StatusDot status={statusToType(status)} size={5} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center font-mono text-[11px] text-terminal-fg-tertiary py-8">
            No cards found
          </div>
        )}
      </div>

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard.card}
          lane={selectedCard.lane}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  )
}
