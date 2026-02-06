'use client'

import { Button } from '@/components/ui/button'
import { EVENT_CATEGORIES, CATEGORY_COLORS } from './EventTypeBadge'
import { RefreshCw } from 'lucide-react'

const SOURCES = [
  { value: 'claude_code', label: 'Claude Code' },
  { value: 'antigravity', label: 'Antigravity' },
  { value: 'dea', label: 'dea' },
  { value: 'user', label: 'User' },
  { value: 'system', label: 'System' },
  { value: 'webhook.jira', label: 'Jira' },
  { value: 'webhook.linear', label: 'Linear' },
  { value: 'webhook.gcal', label: 'GCal' },
] as const

interface EventFiltersProps {
  selectedType: string
  selectedSource: string
  onTypeChange: (type: string) => void
  onSourceChange: (source: string) => void
  onRefresh: () => void
  lastUpdated: Date | null
  loading: boolean
}

export function EventFilters({
  selectedType,
  selectedSource,
  onTypeChange,
  onSourceChange,
  onRefresh,
  lastUpdated,
  loading,
}: EventFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Type filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">Type:</span>
        <Button
          variant={selectedType === '' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => onTypeChange('')}
          className="font-mono"
        >
          All
        </Button>
        {EVENT_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat]
          const isActive = selectedType === cat
          return (
            <Button
              key={cat}
              variant={isActive ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => onTypeChange(isActive ? '' : cat)}
              className={`font-mono ${isActive && colors ? `${colors.text}` : ''}`}
            >
              {cat}
            </Button>
          )
        })}
      </div>

      {/* Source filter + refresh row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">Source:</span>
        <Button
          variant={selectedSource === '' ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => onSourceChange('')}
          className="font-mono"
        >
          All
        </Button>
        {SOURCES.map((src) => {
          const isActive = selectedSource === src.value
          return (
            <Button
              key={src.value}
              variant={isActive ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => onSourceChange(isActive ? '' : src.value)}
              className="font-mono"
            >
              {src.label}
            </Button>
          )
        })}

        {/* Spacer + refresh */}
        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh events"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  return `${diffMin}m ago`
}
