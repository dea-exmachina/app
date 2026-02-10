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
import type { EnhancedNodeData } from '@/lib/architecture/nodes'
import { STATUS_COLORS, ARCHITECTURE_EDGES, TIER_COLORS } from '@/lib/architecture/nodes'
import { DATA_FLOW_COLORS, type DataFlowType } from '@/types/architecture'

interface NodeDetailPanelProps {
  node: Node<EnhancedNodeData> | null
  open: boolean
  onClose: () => void
}

export function NodeDetailPanel({ node, open, onClose }: NodeDetailPanelProps) {
  if (!node) return null

  const data = node.data
  const statusColors = STATUS_COLORS[data.status]
  const tierColors = TIER_COLORS[data.tier]

  // Find connected edges
  const incomingEdges = ARCHITECTURE_EDGES.filter((e) => e.target === node.id)
  const outgoingEdges = ARCHITECTURE_EDGES.filter((e) => e.source === node.id)

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${statusColors.dot} ${
                data.status === 'live' ? 'animate-pulse' : ''
              }`}
            />
            <SheetTitle className="font-mono text-lg">{data.label}</SheetTitle>
          </div>
          <SheetDescription>{data.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tier + Status badges */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${tierColors.bg} ${tierColors.text} border-current font-mono`}
            >
              {data.tier}
            </Badge>
            <Badge
              variant="outline"
              className={`${statusColors.bg} ${statusColors.text} border-current`}
            >
              {data.status}
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              {data.category}
            </Badge>
          </div>

          {/* Brief */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Overview
            </h4>
            <p className="text-sm leading-relaxed">{data.brief}</p>
          </div>

          {/* Tables */}
          {data.tables && data.tables.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Tables ({data.tables.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {data.tables.map((table) => (
                  <Badge
                    key={table}
                    variant="outline"
                    className="font-mono text-xs"
                  >
                    {table}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Secrets */}
          {data.secrets && data.secrets.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Secrets ({data.secrets.length})
              </h4>
              <div className="space-y-1">
                {data.secrets.map((secret) => (
                  <div
                    key={secret.variableName}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {secret.variableName}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {secret.secretType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {secret.location}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflows */}
          {data.workflows && data.workflows.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Workflow Steps
              </h4>
              <div className="space-y-1.5">
                {data.workflows.map((step) => (
                  <div key={step.order} className="flex items-start gap-2 text-xs">
                    <span className="font-mono text-muted-foreground w-4 text-right shrink-0">
                      {step.order}.
                    </span>
                    <div>
                      <span className="font-medium">{step.name}</span>
                      <span className="text-muted-foreground ml-1.5">
                        ({step.type})
                      </span>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Cards */}
          {data.cards && data.cards.length > 0 && (
            <div>
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Related Cards
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.cards.map((card) => (
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

          {/* Data Flows (Connections) */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Data Flows
            </h4>
            <div className="space-y-2">
              {incomingEdges.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Receives from:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {incomingEdges.map((e) => {
                      const dataType = e.data?.dataType as DataFlowType | undefined
                      const flowColor = dataType
                        ? DATA_FLOW_COLORS[dataType].hex
                        : undefined
                      return (
                        <Badge
                          key={e.id}
                          variant="outline"
                          className="font-mono text-xs"
                          style={flowColor ? { borderColor: flowColor, color: flowColor } : {}}
                        >
                          {e.source}
                          {e.label && ` · ${e.label}`}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
              {outgoingEdges.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Sends to:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {outgoingEdges.map((e) => {
                      const dataType = e.data?.dataType as DataFlowType | undefined
                      const flowColor = dataType
                        ? DATA_FLOW_COLORS[dataType].hex
                        : undefined
                      return (
                        <Badge
                          key={e.id}
                          variant="outline"
                          className="font-mono text-xs"
                          style={flowColor ? { borderColor: flowColor, color: flowColor } : {}}
                        >
                          {e.target}
                          {e.label && ` · ${e.label}`}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
              {incomingEdges.length === 0 && outgoingEdges.length === 0 && (
                <p className="text-sm text-muted-foreground">No direct connections</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
