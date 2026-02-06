'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { TeamView } from '@/components/benders/TeamView'
import type { BenderTeam } from '@/types/bender'
import { getTeam } from '@/lib/client/api'

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const [team, setTeam] = useState<BenderTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTeam(name)
      .then((res) => setTeam(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders/teams"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to teams
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders/teams"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to teams
        </Link>
        <div className="text-sm text-destructive">
          Failed to load team: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/benders/teams"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to teams
      </Link>
      <TeamView team={team} />
    </div>
  )
}
