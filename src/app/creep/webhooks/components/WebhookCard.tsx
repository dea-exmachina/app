'use client'

import type { WebhookConfig } from '@/types/creep'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate } from '@/lib/client/formatters'

interface WebhookCardProps {
  config: WebhookConfig
  onSelect: (config: WebhookConfig) => void
}

/**
 * Color map for enabled/disabled status.
 */
const ENABLED_COLORS = {
  true: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  false: {
    bg: 'bg-zinc-500/15',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    dot: 'bg-zinc-400',
  },
} as const

export function WebhookCard({ config, onSelect }: WebhookCardProps) {
  const colors = config.enabled ? ENABLED_COLORS['true'] : ENABLED_COLORS['false']
  const transformFields = countTransformFields(config.transform_config)

  return (
    <button
      onClick={() => onSelect(config)}
      className="w-full text-left rounded-lg border border-border p-4 transition-colors hover:bg-accent/30 focus:outline-none focus:bg-accent/40"
    >
      {/* Header: source name + enabled badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{config.source}</span>
        </div>
        <Badge
          variant="outline"
          className={`font-mono text-xs ${colors.bg} ${colors.text} ${colors.border} gap-1.5 shrink-0`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`}
          />
          {config.enabled ? 'enabled' : 'disabled'}
        </Badge>
      </div>

      {/* Endpoint path */}
      <p className="font-mono text-xs text-muted-foreground truncate mb-2">
        <span className="text-muted-foreground/60">endpoint:</span>{' '}
        {config.endpoint_path}
      </p>

      {/* Secret indicator */}
      {config.secret && (
        <p className="font-mono text-xs text-muted-foreground mb-2">
          <span className="text-muted-foreground/60">secret:</span>{' '}
          {config.secret}
        </p>
      )}

      {/* Footer: transform config summary + last updated */}
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono text-xs text-muted-foreground">
          {transformFields > 0
            ? `${transformFields} field${transformFields !== 1 ? 's' : ''} mapped`
            : 'no transform config'}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelativeDate(config.updated_at)}
        </span>
      </div>
    </button>
  )
}

function countTransformFields(config: WebhookConfig['transform_config']): number {
  if (!config) return 0
  let count = 0
  if (config.title_field) count++
  if (config.description_field) count++
  if (config.priority_field) count++
  if (config.tag_fields && config.tag_fields.length > 0) count++
  if (config.status_map && Object.keys(config.status_map).length > 0) count++
  return count
}
