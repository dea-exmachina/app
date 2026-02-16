'use client'

import { useState, useCallback } from 'react'
import type { ComplianceComponent, ComplianceData, ComponentCategory } from '../types'
import { SCORE_THRESHOLDS } from '../types'
import { useComplianceData } from '@/hooks/useComplianceData'
import { ComponentCard } from './ComponentCard'
import { ComponentDetail } from './ComponentDetail'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Shield, Flame, TrendingUp } from 'lucide-react'

const CATEGORY_FILTERS: { value: ComponentCategory | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'integration', label: 'Integration' },
  { value: 'standards', label: 'Standards' },
  { value: 'frontend', label: 'Frontend' },
]

export function ComplianceOverview() {
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | ''>('')
  const [selectedComponent, setSelectedComponent] = useState<ComplianceComponent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data, loading, error, refresh, lastUpdated } = useComplianceData()

  const handleSelect = useCallback((component: ComplianceComponent) => {
    setSelectedComponent(component)
    setDetailOpen(true)
  }, [])

  // Filter components by selected category
  const filteredComponents = data
    ? selectedCategory
      ? data.components.filter((c) => c.category === selectedCategory)
      : data.components
    : []

  return (
    <div className="space-y-6">
      {/* Project Health Hero */}
      {data && !loading && <ProjectHealthHero data={data} />}

      {/* Bender Streaks */}
      {data && !loading && data.streaks.length > 0 && (
        <StreakBar streaks={data.streaks} />
      )}

      {/* Category filters + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">Category:</span>
        {CATEGORY_FILTERS.map((filter) => {
          const count = data
            ? filter.value
              ? data.components.filter((c) => c.category === filter.value).length
              : data.components.length
            : 0
          return (
            <Button
              key={filter.value || 'all'}
              variant={selectedCategory === filter.value ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setSelectedCategory(selectedCategory === filter.value ? '' : filter.value)}
              className="font-mono"
            >
              {filter.label} ({count})
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
            onClick={refresh}
            disabled={loading}
            title="Refresh compliance data"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content area: 4 states */}
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : !data || data.components.length === 0 ? (
        <EmptyState />
      ) : filteredComponents.length === 0 ? (
        <EmptyFilterState
          category={selectedCategory}
          onClear={() => setSelectedCategory('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredComponents.map((component) => (
            <ComponentCard
              key={component.name}
              component={component}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <ComponentDetail
        component={selectedComponent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}

// ── Project Health Hero ─────────────────────────────────

function ProjectHealthHero({ data }: { data: ComplianceData }) {
  const { project_health: health } = data
  const scoreColor = getHeroScoreColor(health.score)

  return (
    <div className="rounded-lg border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
        {/* Hero score */}
        <div>
          <span className="font-mono text-xs text-muted-foreground block mb-1">
            Project Health
          </span>
          <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>
            {health.score}
          </span>
          <span className="text-lg text-muted-foreground ml-1">/ 100</span>
        </div>

        {/* Health bar */}
        <div className="flex-1 min-w-0">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${getHeroBarColor(health.score)}`}
              style={{ width: `${health.score}%` }}
            />
          </div>

          {/* Summary metrics */}
          <div className="flex flex-wrap gap-3">
            <SummaryChip
              label="Components"
              value={String(health.total_components)}
            />
            <SummaryChip
              label="Healthy"
              value={String(health.healthy_count)}
              color="text-emerald-400"
            />
            <SummaryChip
              label="Attention"
              value={String(health.needs_attention_count)}
              color={health.needs_attention_count > 0 ? 'text-amber-400' : undefined}
            />
            <SummaryChip
              label="Critical"
              value={String(health.critical_count)}
              color={health.critical_count > 0 ? 'text-red-400' : undefined}
            />
            {health.stale_count > 0 && (
              <SummaryChip
                label="Stale"
                value={String(health.stale_count)}
                color="text-amber-400"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{label}:</span>
      <span className={`font-mono text-xs font-medium ${color ?? 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}

// ── Bender Streak Bar ───────────────────────────────────

function StreakBar({ streaks }: { streaks: ComplianceData['streaks'] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-1.5 shrink-0">
        <Flame className="h-3.5 w-3.5 text-orange-400" />
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          Bender Streaks
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {streaks.map((streak) => (
          <StreakChip key={streak.role} role={streak.role} count={streak.consecutive_clean} />
        ))}
      </div>
    </div>
  )
}

function StreakChip({ role, count }: { role: string; count: number }) {
  const isHot = count >= 3

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs gap-1.5 ${
        isHot
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {isHot && <TrendingUp className="h-2.5 w-2.5" />}
      {role}
      <span className={`font-bold ${isHot ? 'text-emerald-300' : ''}`}>
        {count}
      </span>
    </Badge>
  )
}

// ── State Components ────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="rounded-lg border border-border p-6">
        <div className="flex items-end gap-8">
          <div>
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-12 w-24" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-2.5 w-full mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-18" />
            </div>
          </div>
        </div>
      </div>
      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-end gap-3">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-1.5 flex-1" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <AlertCircle className="h-8 w-8 text-destructive mb-3" />
      <p className="text-sm font-medium mb-1">Failed to load compliance data</p>
      <p className="text-xs text-muted-foreground mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="font-mono text-xs text-primary hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <Shield className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">No compliance data</p>
      <p className="text-xs text-muted-foreground">
        Compliance scores will appear here after the first component audit.
      </p>
    </div>
  )
}

function EmptyFilterState({
  category,
  onClear,
}: {
  category: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border rounded-lg">
      <Shield className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">No {category} components</p>
      <p className="text-xs text-muted-foreground mb-3">
        No components in the &quot;{category}&quot; category.
      </p>
      <button
        onClick={onClear}
        className="font-mono text-xs text-primary hover:underline"
      >
        Show all components
      </button>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────

function getHeroScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return 'text-emerald-400'
  if (score >= SCORE_THRESHOLDS.yellow) return 'text-yellow-400'
  if (score >= SCORE_THRESHOLDS.orange) return 'text-orange-400'
  return 'text-red-400'
}

function getHeroBarColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return 'bg-emerald-500'
  if (score >= SCORE_THRESHOLDS.yellow) return 'bg-yellow-500'
  if (score >= SCORE_THRESHOLDS.orange) return 'bg-orange-500'
  return 'bg-red-500'
}

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  return `${diffMin}m ago`
}
