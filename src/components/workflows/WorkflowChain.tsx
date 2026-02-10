'use client'

import Link from 'next/link'
import type { Workflow } from '@/types/workflow'
import { TIER_COLORS } from '@/types/architecture'

interface WorkflowChainProps {
  workflow: Workflow
}

export function WorkflowChain({ workflow }: WorkflowChainProps) {
  const { chainPrev, chainPrevTitle, chainNext, chainNextTitle, layer } = workflow

  if (!chainPrev && !chainNext) return null

  const tierColor = layer ? TIER_COLORS[layer] : null
  const accentColor = tierColor?.accent ?? 'rgb(148, 163, 184)' // slate-400 fallback

  return (
    <div className="flex items-center gap-3">
      {/* Prev */}
      {chainPrev ? (
        <Link
          href={`/workflows/${chainPrev}`}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-accent"
          style={{ borderColor: accentColor }}
        >
          <span style={{ color: accentColor }}>&larr;</span>
          <span className="max-w-[140px] truncate text-muted-foreground">
            {chainPrevTitle ?? chainPrev}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {/* Position indicator */}
      <span className="font-mono text-xs text-muted-foreground" style={{ color: accentColor }}>
        chain
      </span>

      {/* Next */}
      {chainNext ? (
        <Link
          href={`/workflows/${chainNext}`}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-accent"
          style={{ borderColor: accentColor }}
        >
          <span className="max-w-[140px] truncate text-muted-foreground">
            {chainNextTitle ?? chainNext}
          </span>
          <span style={{ color: accentColor }}>&rarr;</span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
