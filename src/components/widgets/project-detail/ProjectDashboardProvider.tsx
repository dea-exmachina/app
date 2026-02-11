'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useProjectDashboard } from '@/hooks/useProjectDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProjectDashboardData, ProjectNotes, ProjectLink } from '@/types/project'

interface ProjectDashboardContextValue {
  data: ProjectDashboardData
  saveNotes: (notes: Partial<ProjectNotes>) => Promise<void>
  saveLinks: (items: ProjectLink[]) => Promise<void>
}

const ProjectDashboardContext = createContext<ProjectDashboardContextValue | undefined>(undefined)

export function ProjectDashboardProvider({
  slugOrId,
  children,
}: {
  slugOrId: string
  children: ReactNode
}) {
  const { data, loading, error, saveNotes, saveLinks } = useProjectDashboard(slugOrId)

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-sm text-destructive">
          Failed to load project dashboard: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <ProjectDashboardContext.Provider value={{ data, saveNotes, saveLinks }}>
      {children}
    </ProjectDashboardContext.Provider>
  )
}

export function useProjectDashboardContext() {
  const context = useContext(ProjectDashboardContext)
  if (context === undefined) {
    throw new Error(
      'useProjectDashboardContext must be used within a ProjectDashboardProvider'
    )
  }
  return context
}
