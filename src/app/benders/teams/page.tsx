'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SectionDivider } from '@/components/ui/section-divider'
import type { BenderTeam } from '@/types/bender'
import { getTeams } from '@/lib/client/api'

export default function TeamsPage() {
  const [teams, setTeams] = useState<BenderTeam[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getTeams()
      .then((res) => setTeams(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
        <span className="font-semibold uppercase tracking-wider text-terminal-fg-primary">
          Teams
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="font-mono text-[11px] text-terminal-fg-tertiary">
          Loading...
        </div>
      ) : error || !teams ? (
        <div className="font-mono text-[11px] text-status-error">
          Failed to load teams: {error || 'Unknown error'}
        </div>
      ) : (
        <div>
          <SectionDivider label="Teams" count={`${teams.length}`} />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="border-b border-terminal-border text-terminal-fg-tertiary">
                  <th className="pb-1.5 pr-3 text-left font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="pb-1.5 px-2 text-right font-semibold uppercase tracking-wider w-16">
                    Members
                  </th>
                  <th className="pb-1.5 pl-3 text-left font-semibold uppercase tracking-wider">
                    Agents
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.name} className="group hover:bg-terminal-bg-elevated/50">
                    <td className="py-1.5 pr-3">
                      <Link
                        href={`/benders/teams/${team.name}`}
                        className="text-terminal-fg-primary group-hover:text-user-accent transition-colors font-semibold"
                      >
                        {team.name}
                      </Link>
                    </td>
                    <td className="py-1.5 px-2 text-right text-terminal-fg-secondary">
                      {team.members.length}
                    </td>
                    <td className="py-1.5 pl-3 text-terminal-fg-tertiary">
                      {team.members.map((m) => m.name).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
