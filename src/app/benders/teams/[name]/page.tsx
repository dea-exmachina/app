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

  return (
    <div className="p-4 space-y-3">
      {/* Nav bar */}
      <div className="flex items-center gap-3 font-mono text-[11px] border-b border-terminal-border pb-2">
        <Link
          href="/benders"
          className="text-terminal-fg-tertiary hover:text-user-accent transition-colors"
        >
          BENDERS
        </Link>
        <span className="text-terminal-fg-tertiary">/</span>
        <Link
          href="/benders/teams"
          className="text-terminal-fg-tertiary hover:text-user-accent transition-colors"
        >
          TEAMS
        </Link>
        <span className="text-terminal-fg-tertiary">/</span>
        <span className="font-semibold text-terminal-fg-primary">
          {decodeURIComponent(name)}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">
          Loading...
        </div>
      ) : error || !team ? (
        <div className="font-mono text-[11px] text-status-error">
          Failed to load team: {error || 'Unknown error'}
        </div>
      ) : (
        <TeamView team={team} />
      )}
    </div>
  )
}
