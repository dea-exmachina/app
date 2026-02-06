'use client'

import type { AgentHealth } from '@/types/queen'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from './StatusBadge'
import { formatRelativeDate } from '@/lib/client/formatters'

interface AgentDetailProps {
  agent: AgentHealth | null
  open: boolean
  onClose: () => void
}

export function AgentDetail({ agent, open, onClose }: AgentDetailProps) {
  if (!agent) return null

  const metrics = agent.metrics
  const stuckDuration = agent.status === 'stuck' ? getStuckDuration(agent.last_activity_at) : null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.status} />
            <Badge variant="outline" className="font-mono text-xs">
              {agent.platform}
            </Badge>
          </div>
          <SheetTitle className="text-base">{agent.agent_name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            Last active: {new Date(agent.last_activity_at).toLocaleString()} ({formatRelativeDate(agent.last_activity_at)})
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Stuck alert within detail */}
            {agent.status === 'stuck' && stuckDuration && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                <p className="text-xs font-medium text-red-400">
                  Stuck for {stuckDuration}
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  No activity since {formatRelativeDate(agent.last_activity_at)}. Threshold: {metrics.stuck_threshold ?? 900}s.
                </p>
              </div>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetadataField label="Agent Name" value={agent.agent_name} mono />
              <MetadataField label="Platform" value={agent.platform} mono />
              <MetadataField label="Status" value={agent.status} mono />
              <MetadataField label="Current Task" value={agent.current_task ?? 'None'} mono />
              <MetadataField label="Last Activity" value={formatRelativeDate(agent.last_activity_at)} mono />
              <MetadataField label="Updated At" value={formatRelativeDate(agent.updated_at)} mono />
            </div>

            <Separator />

            {/* Metrics section */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-3">
                Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label="Token Usage"
                  value={metrics.token_usage != null ? formatNumber(metrics.token_usage) : 'N/A'}
                />
                <MetricTile
                  label="Tool Calls"
                  value={metrics.tool_calls != null ? String(metrics.tool_calls) : 'N/A'}
                />
                <MetricTile
                  label="Session Start"
                  value={metrics.session_start ? formatRelativeDate(metrics.session_start) : 'N/A'}
                />
                <MetricTile
                  label="Idle Seconds"
                  value={metrics.idle_seconds != null ? `${metrics.idle_seconds}s` : 'N/A'}
                />
                <MetricTile
                  label="Stuck Threshold"
                  value={metrics.stuck_threshold != null ? `${metrics.stuck_threshold}s` : '900s (default)'}
                />
              </div>
            </div>

            <Separator />

            {/* Raw data */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                Raw Metrics
              </h3>
              <pre className="font-mono text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all max-h-48">
                {JSON.stringify(metrics, null, 2)}
              </pre>
            </div>

            {/* ID */}
            <Separator />
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-2">
                Record ID
              </h3>
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                {agent.id}
              </code>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function MetadataField({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <p className={`text-sm truncate ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </p>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <span className="font-mono text-xs text-muted-foreground block">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function getStuckDuration(lastActivityAt: string): string {
  const diffMs = Date.now() - new Date(lastActivityAt).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}
