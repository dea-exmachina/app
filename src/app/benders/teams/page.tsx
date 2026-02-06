'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to benders
        </Link>
        <Header title="Teams" description="Bender team configurations" />
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !teams) {
    return (
      <div className="space-y-6">
        <Link
          href="/benders"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to benders
        </Link>
        <Header title="Teams" description="Bender team configurations" />
        <div className="text-sm text-destructive">
          Failed to load teams: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/benders"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to benders
      </Link>
      <Header title="Teams" description="Bender team configurations" />

      {/* Team List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Link key={team.name} href={`/benders/teams/${team.name}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-base">{team.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Members Count */}
                <div>
                  <span className="font-mono text-2xl font-bold">
                    {team.members.length}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {team.members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>

                {/* Member List */}
                <div>
                  <h4 className="mb-1 font-mono text-xs text-muted-foreground">
                    Members
                  </h4>
                  <ul className="space-y-0.5 text-sm">
                    {team.members.map((member) => (
                      <li key={member.name} className="font-mono text-xs">
                        {member.name}
                        <span className="text-muted-foreground">
                          {' '}
                          — {member.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
