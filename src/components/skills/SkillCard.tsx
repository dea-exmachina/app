import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Skill } from '@/types/skill'
import { getStatusColor } from '@/lib/client/formatters'

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link href={`/skills/${skill.name}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="font-mono text-sm">{skill.name}</CardTitle>
            <Badge
              variant="outline"
              className="shrink-0 font-mono text-xs"
              style={{
                borderColor: getStatusColor(skill.status),
                color: getStatusColor(skill.status),
              }}
            >
              {skill.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{skill.description}</p>
          {skill.workflow && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Workflow:</span>
                <span className="font-mono text-primary">{skill.workflow}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
