'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getTeams } from '@/lib/client/api'
import type { BenderTeam } from '@/types/bender'

export function TeamViewWidget() {
  const [teams, setTeams] = useState<BenderTeam[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTeams()
      .then((res) => setTeams(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error || !teams) {
    return (
      <div className="text-sm text-destructive">
        Failed to load teams: {error || 'Unknown error'}
      </div>
    )
  }

  if (teams.length === 0) {
    return <div className="text-sm text-muted-foreground">No teams found</div>
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <Link
          key={team.name}
          href={`/benders/teams/${team.name}`}
          className="block rounded-md border border-border bg-muted/30 p-3 transition-colors hover:border-primary/50"
        >
          <div className="space-y-2">
            <div className="font-mono text-sm font-semibold">{team.name}</div>
            <div className="text-xs text-muted-foreground">
              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
            </div>
            {team.members.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {team.members.slice(0, 3).map((member) => (
                  <Badge
                    key={member.name}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {member.name}
                  </Badge>
                ))}
                {team.members.length > 3 && (
                  <Badge variant="outline" className="font-mono text-xs">
                    +{team.members.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
