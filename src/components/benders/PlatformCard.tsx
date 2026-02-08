import type { BenderPlatform } from '@/types/bender'
import { StatusDot, statusToType } from '@/components/ui/status-dot'

interface PlatformCardProps {
  platform: BenderPlatform
}

/** Compact platform row — used if standalone rendering is needed */
export function PlatformCard({ platform }: PlatformCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-terminal-border bg-terminal-bg-surface p-2 font-mono text-[11px]">
      <span className="font-semibold text-terminal-fg-primary">
        {platform.name}
      </span>
      <StatusDot
        status={statusToType(platform.status)}
        label={platform.status}
        size={5}
      />
      <span className="text-terminal-fg-tertiary">{platform.interface}</span>
      <span className="text-terminal-fg-secondary ml-auto">
        {platform.models.join(', ')}
      </span>
    </div>
  )
}
