'use client'

import { Button } from '@/components/ui/button'
import { TIERS } from '@/lib/architecture/nodes'
import { TIER_COLORS } from '@/types/architecture'
import type { ArchitectureTier, NodeStatus } from '@/types/architecture'

interface TierSelectorProps {
  selectedTier: ArchitectureTier | null
  onTierChange: (tier: ArchitectureTier | null) => void
  selectedStatus: NodeStatus | null
  onStatusChange: (status: NodeStatus | null) => void
}

export function TierSelector({
  selectedTier,
  onTierChange,
  selectedStatus,
  onStatusChange,
}: TierSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Tier filter */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">Tier:</span>
        {TIERS.map((tier) => {
          const isActive = selectedTier === tier.id
          const tierColor = tier.id ? TIER_COLORS[tier.id] : null
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
            </Button>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">Status:</span>
        {[
          { id: null, label: 'All' },
          { id: 'live' as const, label: 'Live' },
          { id: 'building' as const, label: 'Building' },
          { id: 'pending' as const, label: 'Pending' },
        ].map((status) => (
          <Button
            key={status.id ?? 'all'}
            variant={selectedStatus === status.id ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => onStatusChange(status.id)}
            className="font-mono"
          >
            {status.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
