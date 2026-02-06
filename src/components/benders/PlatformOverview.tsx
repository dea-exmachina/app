import type { BenderPlatform } from '@/types/bender'
import { PlatformCard } from './PlatformCard'

interface PlatformOverviewProps {
  platforms: BenderPlatform[]
}

export function PlatformOverview({ platforms }: PlatformOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {platforms.map((platform) => (
        <PlatformCard key={platform.slug} platform={platform} />
      ))}
    </div>
  )
}
