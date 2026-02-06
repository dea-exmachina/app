import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BenderTeam } from '@/types/bender'

interface TeamViewProps {
  team: BenderTeam
}

export function TeamView({ team }: TeamViewProps) {
  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{team.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Members */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-semibold text-muted-foreground">
              Team Members
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 text-left font-mono text-xs text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-2 pr-4 text-left font-mono text-xs text-muted-foreground">
                      Role
                    </th>
                    <th className="pb-2 pr-4 text-left font-mono text-xs text-muted-foreground">
                      Platform
                    </th>
                    <th className="pb-2 text-left font-mono text-xs text-muted-foreground">
                      Invocation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((member) => (
                    <tr key={member.name} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono">{member.name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {member.role}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {member.platform}
                      </td>
                      <td className="py-2 font-mono text-xs text-primary">
                        {member.invocation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sequencing */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-semibold text-muted-foreground">
              Sequencing
            </h3>
            <p className="text-sm text-foreground/90">{team.sequencing}</p>
          </div>

          {/* Branch Strategy */}
          <div>
            <h3 className="mb-2 font-mono text-sm font-semibold text-muted-foreground">
              Branch Strategy
            </h3>
            <p className="text-sm text-foreground/90">{team.branchStrategy}</p>
          </div>
        </CardContent>
      </Card>

      {/* File Ownership */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">File Ownership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(team.fileOwnership).map(([bender, ownership]) => (
              <div
                key={bender}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <h4 className="mb-2 font-mono text-sm font-semibold">
                  {bender}
                </h4>
                <div className="space-y-2 text-sm">
                  {ownership.owns.length > 0 && (
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">
                        Owns:
                      </span>
                      <ul className="ml-4 mt-1 list-inside list-disc font-mono text-xs">
                        {ownership.owns.map((path, i) => (
                          <li key={i} className="text-foreground/80">
                            {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ownership.mustNotTouch.length > 0 && (
                    <div>
                      <span className="font-mono text-xs text-destructive">
                        Must Not Touch:
                      </span>
                      <ul className="ml-4 mt-1 list-inside list-disc font-mono text-xs">
                        {ownership.mustNotTouch.map((path, i) => (
                          <li key={i} className="text-destructive/80">
                            {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
