'use client'

import { Button } from '@/components/ui/button'
import { ARCHITECTURE_TIERS, TIER_COLORS } from '@/types/architecture'
import type { ArchitectureTier } from '@/types/architecture'

interface TierFilterProps {
  selectedTier: ArchitectureTier | null
  onTierChange: (tier: ArchitectureTier | null) => void
  counts?: Partial<Record<ArchitectureTier | 'all', number>>
}

export function TierFilter({
  selectedTier,
  onTierChange,
  counts,
}: TierFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">Layer:</span>
      {ARCHITECTURE_TIERS.map((tier) => {
        const isActive = selectedTier === tier.id
        const tierColor = tier.id ? TIER_COLORS[tier.id] : null
        const count = counts
          ? tier.id
            ? counts[tier.id]
            : counts.all
          : undefined
        return (
          <Button
            key={tier.id ?? 'all'}
            variant={isActive ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => onTierChange(tier.id)}
            className="font-mono"
            title={tier.description}
          >
            {tierColor && (
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${tierColor.dot}`}
              />
            )}
            {tier.label}
            {count !== undefined && (
              <span className="ml-1 text-muted-foreground">({count})</span>
            )}
          </Button>
        )
      })}
    </div>
  )
}
