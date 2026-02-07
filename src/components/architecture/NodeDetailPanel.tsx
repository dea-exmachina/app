'use client'

import type { Node } from 'reactflow'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { SystemNodeData, InfraNodeData } from '@/lib/architecture/nodes'
import { STATUS_COLORS, PHASES, ARCHITECTURE_EDGES } from '@/lib/architecture/nodes'

interface NodeDetailPanelProps {
  node: Node<SystemNodeData | InfraNodeData> | null
  open: boolean
  onClose: () => void
}

export function NodeDetailPanel({ node, open, onClose }: NodeDetailPanelProps) {
  if (!node) return null

  const data = node.data
  const colors = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS]
  const isSystem = node.type === 'system'
  const systemData = isSystem ? (data as SystemNodeData) : null

  // Find connected nodes
  const incomingEdges = ARCHITECTURE_EDGES.filter((e) => e.target === node.id)
  const outgoingEdges = ARCHITECTURE_EDGES.filter((e) => e.source === node.id)

  // Get phase names
  const phaseNames = data.phase
    .map((p) => PHASES.find((ph) => ph.id === p)?.label)
    .filter(Boolean)

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${colors.dot} ${
                data.status === 'live' ? 'animate-pulse' : ''
              }`}
            />
            <SheetTitle className="font-mono text-lg">{data.label}</SheetTitle>
            <Badge
              variant="outline"
              className={`${colors.bg} ${colors.text} border-current`}
            >
              {data.status}
            </Badge>
          </div>
          <SheetDescription>{data.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Node Type */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Type
            </h4>
            <p className="text-sm">{isSystem ? 'Core System' : 'Infrastructure'}</p>
          </div>

          {/* Phases */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Build Phases
            </h4>
            <div className="flex flex-wrap gap-2">
              {phaseNames.map((name) => (
                <Badge key={name} variant="secondary" className="font-mono text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Related Cards (only for system nodes) */}
          {systemData?.cards && systemData.cards.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Related Cards
              </h4>
              <div className="flex flex-wrap gap-2">
                {systemData.cards.map((card) => (
                  <Badge
                    key={card}
                    variant="outline"
                    className="font-mono text-xs cursor-pointer hover:bg-accent"
                  >
                    {card}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Dependencies
            </h4>
            <div className="space-y-2">
              {incomingEdges.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Receives from: </span>
                  {incomingEdges.map((e) => (
                    <Badge key={e.id} variant="outline" className="font-mono text-xs ml-1">
                      {e.source}
                      {e.label && ` (${e.label})`}
                    </Badge>
                  ))}
                </div>
              )}
              {outgoingEdges.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Sends to: </span>
                  {outgoingEdges.map((e) => (
                    <Badge key={e.id} variant="outline" className="font-mono text-xs ml-1">
                      {e.target}
                      {e.label && ` (${e.label})`}
                    </Badge>
                  ))}
                </div>
              )}
              {incomingEdges.length === 0 && outgoingEdges.length === 0 && (
                <p className="text-sm text-muted-foreground">No direct dependencies</p>
              )}
            </div>
          </div>

          {/* Status Legend */}
          <div className="border-t border-border pt-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Status Legend
            </h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-muted-foreground">Live</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Building</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
                <span className="text-muted-foreground">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
