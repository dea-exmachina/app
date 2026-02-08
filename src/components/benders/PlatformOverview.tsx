import type { BenderPlatform } from '@/types/bender'
import { StatusDot, statusToType } from '@/components/ui/status-dot'
import { SectionDivider } from '@/components/ui/section-divider'

interface PlatformOverviewProps {
  platforms: BenderPlatform[]
}

export function PlatformOverview({ platforms }: PlatformOverviewProps) {
  const activeCount = platforms.filter((p) => p.status === 'active').length

  return (
    <div>
      <SectionDivider
        label="Benders"
        count={`${activeCount} active`}
      />

      <div className="mt-2 overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-fg-tertiary">
              <th className="pb-1.5 pr-3 text-left font-semibold uppercase tracking-wider">
                Name
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider">
                Platform
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider">
                Status
              </th>
              <th className="pb-1.5 px-2 text-left font-semibold uppercase tracking-wider">
                Models
              </th>
              <th className="pb-1.5 pl-2 text-left font-semibold uppercase tracking-wider">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => (
              <tr key={platform.slug} className="group hover:bg-terminal-bg-elevated/50">
                <td className="py-1.5 pr-3 text-terminal-fg-primary font-semibold">
                  {platform.name}
                </td>
                <td className="py-1.5 px-2 text-terminal-fg-secondary">
                  {platform.interface}
                </td>
                <td className="py-1.5 px-2">
                  <StatusDot
                    status={statusToType(platform.status)}
                    label={platform.status}
                    size={5}
                  />
                </td>
                <td className="py-1.5 px-2 text-terminal-fg-secondary truncate max-w-[200px]">
                  {platform.models.join(', ')}
                </td>
                <td className="py-1.5 pl-2">
                  <span
                    className={
                      platform.costTier === 'cheap'
                        ? 'text-status-ok'
                        : platform.costTier === 'expensive'
                          ? 'text-status-error'
                          : 'text-terminal-fg-tertiary'
                    }
                  >
                    {platform.costTier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
