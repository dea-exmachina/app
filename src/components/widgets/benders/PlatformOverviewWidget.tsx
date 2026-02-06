'use client'

import { PlatformOverview } from '@/components/benders/PlatformOverview'
import { Skeleton } from '@/components/ui/skeleton'
import { useBenders } from '@/hooks/useBenders'

export function PlatformOverviewWidget() {
  const { data: platforms, loading, error } = useBenders()

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !platforms) {
    return (
      <div className="text-sm text-destructive">
        Failed to load platforms: {error || 'Unknown error'}
      </div>
    )
  }

  return <PlatformOverview platforms={platforms} />
}
