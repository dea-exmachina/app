import type { BenderTeam } from '@/types/bender'
import { SectionDivider } from '@/components/ui/section-divider'

interface TeamViewProps {
  team: BenderTeam
}

export function TeamView({ team }: TeamViewProps) {
  return (
    <div className="space-y-4">
      {/* Team name */}
      <div className="font-mono text-sm font-semibold text-terminal-fg-primary">
        {team.name}
      </div>

      {/* Members table */}
      <div>
        <SectionDivider
          label="Members"
          count={`${team.members.length}`}
        />
        <div className="mt-1.5 overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead>
              <tr className="border-b border-terminal-border text-terminal-fg-tertiary">
                <th className="pb-1 pr-3 text-left font-semibold uppercase tracking-wider">
                  Name
                </th>
                <th className="pb-1 px-2 text-left font-semibold uppercase tracking-wider">
                  Role
                </th>
                <th className="pb-1 px-2 text-left font-semibold uppercase tracking-wider">
                  Platform
                </th>
                <th className="pb-1 pl-2 text-left font-semibold uppercase tracking-wider">
                  Invocation
                </th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((member) => (
                <tr
                  key={member.name}
                  className="hover:bg-terminal-bg-elevated/50"
                >
                  <td className="py-1 pr-3 text-terminal-fg-primary font-semibold">
                    {member.name}
                  </td>
                  <td className="py-1 px-2 text-terminal-fg-secondary">
                    {member.role}
                  </td>
                  <td className="py-1 px-2 text-terminal-fg-tertiary">
                    {member.platform}
                  </td>
                  <td className="py-1 pl-2 text-user-accent">
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
        <SectionDivider label="Sequencing" />
        <p className="mt-1.5 font-mono text-[11px] text-terminal-fg-secondary">
          {team.sequencing}
        </p>
      </div>

      {/* Branch Strategy */}
      <div>
        <SectionDivider label="Branch Strategy" />
        <p className="mt-1.5 font-mono text-[11px] text-terminal-fg-secondary">
          {team.branchStrategy}
        </p>
      </div>

      {/* File Ownership */}
      <div>
        <SectionDivider label="File Ownership" />
        <div className="mt-1.5 space-y-2">
          {Object.entries(team.fileOwnership).map(([bender, ownership]) => (
            <div
              key={bender}
              className="rounded-sm border border-terminal-border bg-terminal-bg-elevated/30 p-2"
            >
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-terminal-fg-secondary mb-1">
                {bender}
              </div>
              <div className="space-y-1 font-mono text-[10px]">
                {ownership.owns.length > 0 && (
                  <div>
                    <span className="text-terminal-fg-tertiary">owns: </span>
                    <span className="text-terminal-fg-secondary">
                      {ownership.owns.join(', ')}
                    </span>
                  </div>
                )}
                {ownership.mustNotTouch.length > 0 && (
                  <div>
                    <span className="text-status-error">restricted: </span>
                    <span className="text-status-error/80">
                      {ownership.mustNotTouch.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
