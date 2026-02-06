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
import { PhaseSelector } from '@/components/architecture/PhaseSelector'
import { NodeDetailPanel } from '@/components/architecture/NodeDetailPanel'
import {
  KERRIGAN_NODES,
  KERRIGAN_EDGES,
  getNodesForPhase,
  type SystemNodeData,
  type InfraNodeData,
} from '@/lib/architecture/nodes'

const nodeTypes = {
  system: SystemNode,
  infra: InfraNode,
}

export default function ArchitecturePage() {
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node<SystemNodeData | InfraNodeData> | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filter nodes based on selected phase
  const filteredNodeIds = useMemo(
    () => new Set(getNodesForPhase(selectedPhase)),
    [selectedPhase]
  )

  // Apply dimming to nodes not in the selected phase
  const styledNodes = useMemo(() => {
    return KERRIGAN_NODES.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: filteredNodeIds.has(node.id) ? 1 : 0.3,
        transition: 'opacity 0.2s ease-in-out',
      },
    }))
  }, [filteredNodeIds])

  // Apply dimming to edges not connected to visible nodes
  const styledEdges = useMemo(() => {
    return KERRIGAN_EDGES.map((edge) => {
      const isVisible =
        filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isVisible ? 1 : 0.2,
          stroke: 'hsl(var(--muted-foreground))',
          transition: 'opacity 0.2s ease-in-out',
        },
        labelStyle: {
          opacity: isVisible ? 1 : 0,
          fill: 'hsl(var(--muted-foreground))',
          fontSize: 10,
        },
      }
    })
  }, [filteredNodeIds])

  const [nodes, , onNodesChange] = useNodesState(styledNodes)
  const [edges, , onEdgesChange] = useEdgesState(styledEdges)

  // Update nodes when phase changes
  useMemo(() => {
    onNodesChange(
      styledNodes.map((node) => ({
        type: 'reset',
        item: node,
      }))
    )
  }, [styledNodes, onNodesChange])

  // Update edges when phase changes
  useMemo(() => {
    onEdgesChange(
      styledEdges.map((edge) => ({
        type: 'reset',
        item: edge,
      }))
    )
  }, [styledEdges, onEdgesChange])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<SystemNodeData | InfraNodeData>) => {
      setSelectedNode(node)
      setDetailOpen(true)
    },
    []
  )

  return (
    <div className="space-y-6">
      <Header
        title="KERRIGAN Architecture"
        description="Interactive system diagram — click nodes for details"
      />

      <div className="flex items-center justify-between">
        <PhaseSelector selectedPhase={selectedPhase} onPhaseChange={setSelectedPhase} />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Live
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Building
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-zinc-400" />
            Pending
          </div>
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
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background color="hsl(var(--muted-foreground))" gap={20} size={1} />
          <Controls className="!bg-card !border-border !shadow-none" />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              const status = (node.data as SystemNodeData | InfraNodeData).status
              if (status === 'live') return 'rgb(52, 211, 153)' // emerald-400
              if (status === 'building') return 'rgb(251, 191, 36)' // amber-400
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
