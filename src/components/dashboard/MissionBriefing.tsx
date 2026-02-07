import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { HandoffSection } from '@/types/kanban'
import { formatRelativeDate } from '@/lib/client/formatters'

interface MissionBriefingProps {
  handoff: HandoffSection | null
}

export function MissionBriefing({ handoff }: MissionBriefingProps) {
  if (!handoff) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Mission Briefing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No handoff data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm">Mission Briefing</CardTitle>
          <span className="font-mono text-xs text-muted-foreground">
            {formatRelativeDate(handoff.updated)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Where We Left Off */}
        <div>
          <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
            Where We Left Off
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="font-mono text-muted-foreground">Project:</span>
              <span>{handoff.whereWeLeftOff.project}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-muted-foreground">State:</span>
              <span>{handoff.whereWeLeftOff.state}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-muted-foreground">
                Location:
              </span>
              <span className="font-mono text-xs">
                {handoff.whereWeLeftOff.location}
              </span>
            </div>
          </div>
        </div>

        {/* Context */}
        {handoff.context && (
          <div>
            <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
              Context
            </h3>
            <p className="text-sm text-foreground/90">{handoff.context}</p>
          </div>
        )}

        {/* Next Items */}
        {handoff.nextItems.length > 0 && (
          <div>
            <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
              Next
            </h3>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              {handoff.nextItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Blockers */}
        {handoff.blockers.length > 0 && (
          <div>
            <h3 className="mb-2 font-mono text-xs font-semibold text-destructive">
              Blockers
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-destructive/90">
              {handoff.blockers.map((blocker, i) => (
                <li key={i}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bender Status */}
        {handoff.benderStatus.length > 0 && (
          <div>
            <h3 className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
              Bender Status
            </h3>
            <div className="space-y-2">
              {handoff.benderStatus.map((bender, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-md border border-border bg-muted/30 p-2"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-muted-foreground">
                      {bender.taskId}
                    </div>
                    <div className="text-sm">{bender.description}</div>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {bender.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
