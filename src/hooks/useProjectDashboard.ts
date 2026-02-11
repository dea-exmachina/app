'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectDashboardData, ProjectNotes, ProjectLink } from '@/types/project'
import { getProjectDashboard, updateProjectNotes, updateProjectLinks } from '@/lib/client/api'

export function useProjectDashboard(slugOrId: string) {
  const [data, setData] = useState<ProjectDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getProjectDashboard(slugOrId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slugOrId])

  const saveNotes = useCallback(
    async (notes: Partial<ProjectNotes>) => {
      if (!data) return
      // Optimistic update
      const prev = data.notes
      setData((d) =>
        d
          ? {
              ...d,
              notes: {
                checklist: notes.checklist !== undefined ? notes.checklist : d.notes.checklist,
                freeform: notes.freeform !== undefined ? notes.freeform : d.notes.freeform,
              },
            }
          : d
      )
      try {
        await updateProjectNotes(slugOrId, notes)
      } catch {
        // Revert on failure
        setData((d) => (d ? { ...d, notes: prev } : d))
      }
    },
    [slugOrId, data]
  )

  const saveLinks = useCallback(
    async (items: ProjectLink[]) => {
      if (!data) return
      const prev = data.links
      setData((d) => (d ? { ...d, links: items } : d))
      try {
        await updateProjectLinks(slugOrId, items)
      } catch {
        setData((d) => (d ? { ...d, links: prev } : d))
      }
    },
    [slugOrId, data]
  )

  return { data, loading, error, saveNotes, saveLinks }
}
