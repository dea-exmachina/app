'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        Loading teams...
      </div>
    )
  }

  if (error || !teams) {
    return (
      <div className="font-mono text-[11px] text-status-error">
        Failed to load teams: {error || 'Unknown error'}
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="font-mono text-[11px] text-terminal-fg-tertiary">
        No teams found
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {teams.map((team) => (
        <Link
          key={team.name}
          href={`/benders/teams/${team.name}`}
          className="block rounded-sm border border-terminal-border p-2 hover:border-terminal-border-strong transition-colors"
        >
          <div className="font-mono text-[11px] font-semibold text-terminal-fg-primary">
            {team.name}
          </div>
          <div className="font-mono text-[10px] text-terminal-fg-tertiary mt-0.5">
            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
            {team.members.length > 0 && (
              <span className="text-terminal-fg-secondary ml-2">
                {team.members.map((m) => m.name).join(', ')}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
