'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { PlatformOverview } from '@/components/benders/PlatformOverview'
import { useBenders } from '@/hooks/useBenders'

export default function BendersPage() {
  const { data: platforms, loading, error } = useBenders()

  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="Benders"
          description="Platform overview and task management"
        />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !platforms) {
    return (
      <div className="space-y-6">
        <Header
          title="Benders"
          description="Platform overview and task management"
        />
        <div className="text-sm text-destructive">
          Failed to load platforms: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header title="Benders" description="Platform overview and task management" />

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href="/benders/teams"
          className="font-mono text-sm text-primary hover:underline"
        >
          View Teams →
        </Link>
        <Link
          href="/benders/tasks"
          className="font-mono text-sm text-primary hover:underline"
        >
          Browse Tasks →
        </Link>
      </div>

      {/* Platform Grid */}
      <PlatformOverview platforms={platforms} />
    </div>
  )
}
