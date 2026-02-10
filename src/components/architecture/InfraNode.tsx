'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { EnhancedNodeData } from '@/lib/architecture/nodes'
import { STATUS_COLORS, TIER_COLORS } from '@/lib/architecture/nodes'

function InfraNodeComponent({ data, selected }: NodeProps<EnhancedNodeData>) {
  const statusColors = STATUS_COLORS[data.status]
  const tierColors = TIER_COLORS[data.tier]

  return (
    <div
      className={`px-3 py-2 rounded-md border min-w-[120px] max-w-[150px] transition-all ${tierColors.border} ${tierColors.bg} ${
        selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${statusColors.dot} ${
            data.status === 'live' ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-mono text-xs font-medium">{data.label}</span>
      </div>

      <p className="text-[10px] text-muted-foreground mt-0.5">{data.description}</p>

      {data.secrets && data.secrets.length > 0 && (
        <div className="mt-1">
          <span className="font-mono text-[9px] text-muted-foreground/60">
            {data.secrets.length} secrets
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}

export const InfraNode = memo(InfraNodeComponent)
