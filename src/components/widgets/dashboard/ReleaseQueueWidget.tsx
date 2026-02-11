'use client'

import { useState, useEffect, useCallback } from 'react'
import { Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TerminalTable, type TerminalColumn } from '@/components/ui/terminal-table'
import { getReleaseQueue, postInbox } from '@/lib/client/api'
import type { ReleaseQueueCard } from '@/types/nexus'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-status-error',
  high: 'text-status-warn',
  normal: 'text-terminal-fg-primary',
  low: 'text-terminal-fg-tertiary',
}

const columns: TerminalColumn<ReleaseQueueCard>[] = [
  {
    key: 'card_id',
    label: 'ID',
    width: '20%',
    render: (row) => (
      <span className="font-mono text-user-accent">{row.card_id}</span>
    ),
  },
  {
    key: 'title',
    label: 'TITLE',
    width: '40%',
    render: (row) => (
      <span className="text-terminal-fg-primary truncate block">{row.title}</span>
    ),
  },
  {
    key: 'project_name',
    label: 'PROJECT',
    width: '25%',
    render: (row) => (
      <Badge variant="terminal">{row.project_prefix}</Badge>
    ),
  },
  {
    key: 'priority',
    label: 'PRI',
    width: '15%',
    render: (row) => (
      <span className={`font-mono uppercase ${PRIORITY_COLORS[row.priority] || ''}`}>
        {row.priority}
      </span>
    ),
  },
]

export function ReleaseQueueWidget() {
  const [cards, setCards] = useState<ReleaseQueueCard[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)

  useEffect(() => {
    getReleaseQueue()
      .then(({ data }) => {
        setCards(data.cards)
        setTotal(data.total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRequestRelease = useCallback(async () => {
    if (cards.length === 0) return
    setRequesting(true)
    try {
      const cardList = cards.map((c) => `- ${c.card_id}: ${c.title}`).join('\n')
      await postInbox({
        title: `Release requested — ${total} card(s) flagged`,
        content: `${total} cards flagged for production:\n\n${cardList}\n\nRequested from Control Center dashboard.`,
        type: 'instruction',
      })
      setRequested(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request release')
    } finally {
      setRequesting(false)
    }
  }, [cards, total])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-terminal-fg-tertiary">
        Loading release queue...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-status-error">
        {error}
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-terminal-fg-tertiary">
        <Rocket className="h-5 w-5 opacity-40" />
        <span className="font-mono text-xs">No cards flagged for release</span>
      </div>
    )
  }

  // Count unique projects
  const projectCount = new Set(cards.map((c) => c.project_prefix)).size

  return (
    <div className="h-full flex flex-col">
      {/* Header with count */}
      <div className="flex items-center justify-between px-2 pb-2">
        <span className="font-mono text-[10px] text-terminal-fg-secondary">
          {total} card{total !== 1 ? 's' : ''} across {projectCount} project{projectCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Card table */}
      <TerminalTable
        columns={columns}
        data={cards}
        getRowKey={(row) => row.card_id}
        compact
        className="flex-1"
      />

      {/* Release action */}
      <div className="pt-2 px-2 border-t border-terminal-border">
        {requested ? (
          <div className="text-center font-mono text-[10px] text-status-ok py-1">
            Release requested — check inbox
          </div>
        ) : (
          <Button
            variant="outline"
            size="xs"
            className="w-full font-mono text-[10px]"
            onClick={handleRequestRelease}
            disabled={requesting}
          >
            <Rocket className="h-3 w-3 mr-1" />
            {requesting ? 'Requesting...' : 'Request Release'}
          </Button>
        )}
      </div>
    </div>
  )
}
