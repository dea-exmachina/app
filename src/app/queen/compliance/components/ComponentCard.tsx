'use client'

import type { ComplianceComponent } from '../types'
import { SCORE_THRESHOLDS, STALENESS_THRESHOLD_DAYS } from '../types'
import { MaturityBadge } from './MaturityBadge'
import { Badge } from '@/components/ui/badge'

interface ComponentCardProps {
  component: ComplianceComponent
  onSelect: (component: ComplianceComponent) => void
}

export function ComponentCard({ component, onSelect }: ComponentCardProps) {
  const scoreColor = getScoreColor(component.health_score)
  const isStale = getIsStale(component.last_audit_at)
  const deductionCount = component.deductions.length

  return (
    <button
      onClick={() => onSelect(component)}
      className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-accent/30 focus:outline-none focus:bg-accent/40 ${
        component.health_score < SCORE_THRESHOLDS.orange
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-border'
      }`}
    >
      {/* Header: name + maturity */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{component.name}</span>
        </div>
        <MaturityBadge maturity={component.maturity} />
      </div>

      {/* Score display */}
      <div className="flex items-end gap-3 mb-3">
        <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
          {component.health_score}
        </span>
        <span className="text-sm text-muted-foreground mb-1">
          / {component.max_score}
        </span>
        {/* Thin progress bar */}
        <div className="flex-1 mb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getScoreBarColor(component.health_score)}`}
              style={{ width: `${(component.health_score / component.max_score) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: audit info + staleness + deductions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {component.audit_count} audit{component.audit_count !== 1 ? 's' : ''}
          </Badge>
          {isStale && (
            <Badge
              variant="outline"
              className="font-mono text-xs bg-amber-500/15 text-amber-400 border-amber-500/30"
            >
              stale
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {deductionCount > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {deductionCount} issue{deductionCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {formatAuditDate(component.last_audit_at)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Helpers ─────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return 'text-emerald-400'
  if (score >= SCORE_THRESHOLDS.yellow) return 'text-yellow-400'
  if (score >= SCORE_THRESHOLDS.orange) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBarColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.green) return 'bg-emerald-500'
  if (score >= SCORE_THRESHOLDS.yellow) return 'bg-yellow-500'
  if (score >= SCORE_THRESHOLDS.orange) return 'bg-orange-500'
  return 'bg-red-500'
}

function getIsStale(lastAuditAt: string): boolean {
  const daysSince = Math.floor(
    (Date.now() - new Date(lastAuditAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysSince > STALENESS_THRESHOLD_DAYS
}

function formatAuditDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
