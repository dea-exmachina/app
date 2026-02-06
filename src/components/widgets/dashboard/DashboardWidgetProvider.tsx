'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardSummary } from '@/types/dashboard'

interface DashboardContextValue {
  data: DashboardSummary
}

const DashboardContext = createContext<DashboardContextValue | undefined>(
  undefined
)

export function DashboardWidgetProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useDashboard()

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
          Failed to load dashboard: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <DashboardContext.Provider value={{ data }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error(
      'useDashboardContext must be used within a DashboardWidgetProvider'
    )
  }
  return context
}
