'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { EnhancedNodeData } from '@/lib/architecture/nodes'
import { STATUS_COLORS, TIER_COLORS } from '@/lib/architecture/nodes'

function ConstructNodeComponent({ data, selected }: NodeProps<EnhancedNodeData>) {
  const statusColors = STATUS_COLORS[data.status]
  const tierColors = TIER_COLORS[data.tier]

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[160px] max-w-[180px] transition-all ${tierColors.border} ${tierColors.bg} ${
        selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      {/* Module name + status */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-block h-2 w-2 rounded-full ${statusColors.dot} ${
            data.status === 'live' ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-semibold text-sm leading-tight">{data.label}</span>
      </div>

      {/* Authority domain */}
      <p className="text-xs text-muted-foreground mb-1.5">{data.description}</p>

      {/* Compact stats row */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {data.tables && data.tables.length > 0 && (
          <span className="font-mono px-1.5 py-0.5 rounded bg-muted">
            {data.tables.length} tables
          </span>
        )}
        {data.cards && data.cards.length > 0 && (
          <span className="font-mono px-1.5 py-0.5 rounded bg-muted">
            {data.cards.length} cards
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}

export const ConstructNode = memo(ConstructNodeComponent)
