'use client'

import { memo } from 'react'
import { type NodeProps } from 'reactflow'
import type { TierGroupData } from '@/lib/architecture/nodes'
import { TIER_COLORS } from '@/types/architecture'

function TierGroupNodeComponent({ data }: NodeProps<TierGroupData>) {
  const colors = TIER_COLORS[data.tier]

  return (
    <div
      className={`w-full h-full rounded-lg border-2 ${colors.border} bg-transparent relative`}
      style={{ opacity: 0.6 }}
    >
      {/* Tier Label */}
      <div className="absolute -top-3 left-4 px-2 bg-background">
        <span className={`font-mono text-xs font-semibold tracking-wider uppercase ${colors.text}`}>
          {data.label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground ml-2">
          {data.nodeCount} nodes
        </span>
      </div>

      {/* Description */}
      <div className="absolute -bottom-2.5 right-4 px-2 bg-background">
        <span className="font-mono text-[10px] text-muted-foreground">
          {data.description}
        </span>
      </div>
    </div>
  )
}

export const TierGroupNode = memo(TierGroupNodeComponent)
