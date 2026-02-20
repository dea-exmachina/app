'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { KanbanBoard } from '@/types/kanban'
import { BoardView } from './BoardView'
import { SprintRolloverModal } from './SprintRolloverModal'
import { RefreshCw } from 'lucide-react'

interface ProjectOption {
  id: string
  name: string
}

interface Sprint {
  id: string
  name: string
  status: string
  goal?: string
  start_date?: string
  end_date?: string
}

/**
 * Content pipeline projects excluded from the kanban board.
 * The board is scoped to dev/engineering work only.
 * Must stay in sync with EXCLUDED_PROJECT_SLUGS in /api/kanban/unified/route.ts.
 */
const EXCLUDED_PROJECT_SLUGS = new Set([
  'kerkoporta',
  'kerkoporta-writing',
  'job-search',
])

export function UnifiedBoardView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Multi-select: ?projects=council,nexus
  const projectsParam = searchParams.get('projects') ?? ''
  const selectedSlugs = projectsParam ? projectsParam.split(',').filter(Boolean) : []

  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({})
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)
  const [rolloverOpen, setRolloverOpen] = useState(false)

  // Fetch project list for dropdown (exclude content pipeline projects)
  useEffect(() => {
    fetch('/api/kanban/boards')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setProjects(
            (json.data as Array<{ id: string; name: string }>)
              .filter((b) => !EXCLUDED_PROJECT_SLUGS.has(b.id))
              .map((b) => ({ id: b.id, name: b.name }))
          )
        }
      })
      .catch(() => {})
  }, [])

  // Fetch active sprint for rollover button
  useEffect(() => {
    fetch('/api/kanban/sprints')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          const active = (json.data as Sprint[]).find(s => s.status === 'active')
          setActiveSprint(active ?? null)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch unified board data
  const fetchBoard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedSlugs.length > 0) params.set('projects', selectedSlugs.join(','))
      if (dateFilter.start) params.set('done_after', dateFilter.start.toISOString())
      if (dateFilter.end) params.set('done_before', dateFilter.end.toISOString())
      const query = params.toString()
      const url = query ? `/api/kanban/unified?${query}` : '/api/kanban/unified'
      const res = await fetch(url)
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setBoard(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [selectedSlugs.join(','), dateFilter])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const handleProjectToggle = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const current = new Set(selectedSlugs)
    if (current.has(slug)) {
      current.delete(slug)
    } else {
      current.add(slug)
    }
    if (current.size === 0) {
      params.delete('projects')
    } else {
      params.set('projects', Array.from(current).join(','))
    }
    router.push(`/kanban/unified?${params.toString()}`)
  }

  const handleClearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('projects')
    router.push(`/kanban/unified?${params.toString()}`)
  }

  const handleRolloverComplete = () => {
    setRolloverOpen(false)
    setActiveSprint(null)
    // Refresh sprints after rollover
    fetch('/api/kanban/sprints')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          const active = (json.data as Sprint[]).find(s => s.status === 'active')
          setActiveSprint(active ?? null)
        }
      })
      .catch(() => {})
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Project filter chips */}
      <div className="flex items-center gap-2 flex-wrap px-1">
        <span className="font-mono text-[10px] text-terminal-fg-tertiary shrink-0">PROJECTS</span>

        {/* All pill */}
        <button
          onClick={handleClearAll}
          className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
            selectedSlugs.length === 0
              ? 'border-user-accent text-user-accent bg-user-accent/10'
              : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary'
          }`}
        >
          ALL
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => handleProjectToggle(p.id)}
            className={`font-mono text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
              selectedSlugs.includes(p.id)
                ? 'border-user-accent text-user-accent bg-user-accent/10'
                : 'border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary hover:border-terminal-fg-tertiary'
            }`}
          >
            {p.name.toUpperCase()}
          </button>
        ))}

        <span className="ml-auto font-mono text-[10px] text-terminal-fg-tertiary">
          {board ? board.lanes.reduce((sum, l) => sum + l.cards.length, 0) : 0} cards
        </span>

        {/* Rollover Sprint button — only shown when there's an active sprint */}
        {activeSprint && (
          <button
            onClick={() => setRolloverOpen(true)}
            className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded-sm border border-terminal-border text-terminal-fg-tertiary hover:text-terminal-fg-secondary hover:border-terminal-fg-secondary transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            ROLLOVER
          </button>
        )}
      </div>

      {/* Board content */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading board...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-64 text-destructive">
          {error}
        </div>
      )}
      {!loading && !error && board && (
        <BoardView
          board={board}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
        />
      )}

      {/* Sprint Rollover Modal */}
      {rolloverOpen && activeSprint && (
        <SprintRolloverModal
          sprint={activeSprint}
          onClose={() => setRolloverOpen(false)}
          onComplete={handleRolloverComplete}
        />
      )}
    </div>
  )
}
