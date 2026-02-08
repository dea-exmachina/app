'use client'

import { PlatformOverview } from '@/components/benders/PlatformOverview'
import { useBenders } from '@/hooks/useBenders'

export function PlatformOverviewWidget() {
  const { data: platforms, loading, error } = useBenders()

  if (loading) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading platforms...
      </div>
    )
  }

  if (error || !platforms) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load platforms: {error || 'Unknown error'}
      </div>
    )
  }

  return <PlatformOverview platforms={platforms} />
}
