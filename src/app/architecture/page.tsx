'use client'

import { useState, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { Header } from '@/components/layout/Header'
import { SystemNode } from '@/components/architecture/SystemNode'
import { InfraNode } from '@/components/architecture/InfraNode'
import { ConstructNode } from '@/components/architecture/ConstructNode'
import { TierGroupNode } from '@/components/architecture/TierGroupNode'
import { TierSelector } from '@/components/architecture/TierSelector'
import { NodeDetailPanel } from '@/components/architecture/NodeDetailPanel'
import {
  ARCHITECTURE_NODES,
  ARCHITECTURE_EDGES,
  getNodesForTier,
  type EnhancedNodeData,
  type TierGroupData,
} from '@/lib/architecture/nodes'
import { TIER_COLORS, DATA_FLOW_COLORS } from '@/types/architecture'
import type { ArchitectureTier, NodeStatus } from '@/types/architecture'

const nodeTypes = {
  system: SystemNode,
  infra: InfraNode,
  construct: ConstructNode,
  tierGroup: TierGroupNode,
}

export default function ArchitecturePage() {
  const [selectedTier, setSelectedTier] = useState<ArchitectureTier | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<NodeStatus | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node<EnhancedNodeData> | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filter nodes based on selected tier and status
  const filteredNodeIds = useMemo(() => {
    const tierIds = new Set(getNodesForTier(selectedTier))

    if (selectedStatus) {
      // Further filter by status, but always include group nodes
      return new Set(
        ARCHITECTURE_NODES.filter((n) => {
          if (n.type === 'tierGroup') return tierIds.has(n.id)
          const data = n.data as EnhancedNodeData
          return tierIds.has(n.id) && data.status === selectedStatus
        }).map((n) => n.id)
      )
    }

    return tierIds
  }, [selectedTier, selectedStatus])

  // Apply dimming to nodes not matching filter
  const styledNodes = useMemo(() => {
    return ARCHITECTURE_NODES.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: filteredNodeIds.has(node.id) ? 1 : 0.15,
        transition: 'opacity 0.3s ease-in-out',
      },
    }))
  }, [filteredNodeIds])

  // Apply color + dimming to edges
  const styledEdges = useMemo(() => {
    return ARCHITECTURE_EDGES.map((edge) => {
      const isVisible =
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isVisible ? 1 : 0.08,
          transition: 'opacity 0.3s ease-in-out',
        },
        labelStyle: {
          ...edge.labelStyle,
          opacity: isVisible ? 1 : 0,
        },
      }
    })
  }, [filteredNodeIds])

  const [nodes, , onNodesChange] = useNodesState(styledNodes)
  const [edges, , onEdgesChange] = useEdgesState(styledEdges)

  // Update nodes when filter changes
  useMemo(() => {
    onNodesChange(
      styledNodes.map((node) => ({
        type: 'reset' as const,
        item: node,
      }))
    )
  }, [styledNodes, onNodesChange])

  // Update edges when filter changes
  useMemo(() => {
    onEdgesChange(
      styledEdges.map((edge) => ({
        type: 'reset' as const,
        item: edge,
      }))
    )
  }, [styledEdges, onEdgesChange])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Don't open detail panel for group nodes
      if (node.type === 'tierGroup') return
      setSelectedNode(node as Node<EnhancedNodeData>)
      setDetailOpen(true)
    },
    []
  )

  return (
    <div className="space-y-6">
      <Header
        title="META System Architecture"
        description="Interactive 5-tier architecture map — click nodes for drill-down details"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <TierSelector
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Data flow legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {Object.entries(DATA_FLOW_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="inline-block h-0.5 w-3 rounded-full"
                style={{ backgroundColor: colors.hex }}
              />
              {type}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[calc(100vh-280px)] min-h-[400px] border rounded-lg overflow-hidden bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.3}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
          <Controls className="!bg-card !border-border !shadow-none" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              const data = node.data as EnhancedNodeData | TierGroupData
              if ('tier' in data && data.tier) {
                return TIER_COLORS[data.tier].accent
              }
              return 'rgb(161, 161, 170)' // zinc-400
            }}
          />
        </ReactFlow>
      </div>

      <NodeDetailPanel
        node={selectedNode}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
