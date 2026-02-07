'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { SystemNodeData } from '@/lib/architecture/nodes'
import { STATUS_COLORS } from '@/lib/architecture/nodes'

function SystemNodeComponent({ data, selected }: NodeProps<SystemNodeData>) {
  const colors = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS]

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[140px] transition-all ${colors.border} ${colors.bg} ${
        selected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />

      <div className="flex items-center gap-2 mb-1">
        <span
          className={`inline-block h-2 w-2 rounded-full ${colors.dot} ${
            data.status === 'live' ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-semibold text-sm">{data.label}</span>
      </div>

      <p className="text-xs text-muted-foreground">{data.description}</p>

      {data.cards && data.cards.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.cards.slice(0, 2).map((card) => (
            <span
              key={card}
              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {card}
            </span>
          ))}
          {data.cards.length > 2 && (
            <span className="font-mono text-[10px] text-muted-foreground">
              +{data.cards.length - 2}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  )
}

export const SystemNode = memo(SystemNodeComponent)
