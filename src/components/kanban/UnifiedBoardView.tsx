'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { KanbanBoard } from '@/types/kanban'
import { BoardView } from './BoardView'

interface ProjectOption {
  id: string
  name: string
}

export function UnifiedBoardView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectFilter = searchParams.get('project') ?? ''

  const [board, setBoard] = useState<KanbanBoard | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({})

  // Fetch project list for dropdown
  useEffect(() => {
    fetch('/api/kanban/boards')
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setProjects(json.data.map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          })))
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
      if (projectFilter) params.set('project', projectFilter)
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
  }, [projectFilter, dateFilter])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const handleProjectChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('project', slug)
    } else {
      params.delete('project')
    }
    router.push(`/kanban/unified?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Project filter bar */}
      <div className="flex items-center gap-3 px-1">
        <label className="text-sm font-medium text-muted-foreground">
          Project
        </label>
        <select
          value={projectFilter}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {projectFilter && (
          <button
            onClick={() => handleProjectChange('')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filter
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {board ? board.lanes.reduce((sum, l) => sum + l.cards.length, 0) : 0} cards
        </span>
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
    </div>
  )
}
