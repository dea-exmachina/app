'use client'

import { useState } from 'react'
import { SkillGrid } from '@/components/skills/SkillGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useSkills } from '@/hooks/useSkills'

export function SkillGridWidget() {
  const { data: skills, loading, error, refresh } = useSkills()
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ message: string; ok: boolean } | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncStatus(null)
    try {
      const res = await fetch('/api/skills/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setSyncStatus({ message: json.error?.message ?? 'Sync failed', ok: false })
      } else {
        const { synced, deleted, timestamp } = json.data
        setLastSynced(timestamp)
        setSyncStatus({
          message: `Synced ${synced} skill${synced !== 1 ? 's' : ''}${deleted > 0 ? `, removed ${deleted}` : ''}`,
          ok: true,
        })
        refresh()
      }
    } catch {
      setSyncStatus({ message: 'Network error during sync', ok: false })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error || !skills) {
    return (
      <div className="text-sm text-destructive">
        Failed to load skills: {error || 'Unknown error'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {syncStatus && (
            <span
              className={`font-mono text-xs ${syncStatus.ok ? 'text-muted-foreground' : 'text-destructive'}`}
            >
              {syncStatus.message}
            </span>
          )}
          {lastSynced && !syncStatus && (
            <span className="font-mono text-xs text-muted-foreground">
              Synced {new Date(lastSynced).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="font-mono text-xs"
        >
          {syncing ? 'Syncing...' : 'Sync from vault'}
        </Button>
      </div>
      <SkillGrid skills={skills} />
    </div>
  )
}
