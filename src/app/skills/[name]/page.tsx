'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkflowDetail } from '@/components/workflows/WorkflowDetail'
import type { SkillDetail } from '@/types/skill'
import { getSkill } from '@/lib/client/api'
import { getStatusColor, getCategoryColor } from '@/lib/client/formatters'

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)
  const [skill, setSkill] = useState<SkillDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSkill(name)
      .then((res) => setSkill(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          href="/skills"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to skills
        </Link>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div className="space-y-6">
        <Link
          href="/skills"
          className="font-mono text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to skills
        </Link>
        <div className="text-sm text-destructive">
          Failed to load skill: {error || 'Unknown error'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/skills"
        className="font-mono text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to skills
      </Link>

      {/* Skill Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-mono text-xl">{skill.name}</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-xs"
                  style={{
                    borderColor: getCategoryColor(skill.category),
                    color: getCategoryColor(skill.category),
                  }}
                >
                  {skill.category}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs"
                  style={{
                    borderColor: getStatusColor(skill.status),
                    color: getStatusColor(skill.status),
                  }}
                >
                  {skill.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
              Description
            </h3>
            <p className="text-sm">{skill.description}</p>
          </div>
          {skill.workflow && (
            <div>
              <h3 className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
                Linked Workflow
              </h3>
              <Link href={`/workflows/${skill.workflow}`}>
                <Badge variant="outline" className="font-mono hover:border-primary">
                  {skill.workflow}
                </Badge>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Workflow Detail */}
      {skill.linkedWorkflow && (
        <div>
          <h2 className="mb-4 font-mono text-sm font-semibold text-muted-foreground">
            Workflow Detail
          </h2>
          <WorkflowDetail workflow={skill.linkedWorkflow} />
        </div>
      )}
    </div>
  )
}
