'use client'

import type { ComplianceComponent } from '../types'
import { SCORE_THRESHOLDS, SCORE_LEVELS, MATURITY_CRITERIA } from '../types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MaturityBadge } from './MaturityBadge'
import { SeverityBadge } from './SeverityBadge'

interface ComponentDetailProps {
  component: ComplianceComponent | null
  open: boolean
  onClose: () => void
}

export function ComponentDetail({ component, open, onClose }: ComponentDetailProps) {
  if (!component) return null

  const scoreColor = getScoreColor(component.health_score)
  const level = getScoreLevel(component.health_score)
  const totalDeductions = component.deductions.reduce((sum, d) => sum + d.points, 0)

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <MaturityBadge maturity={component.maturity} />
            <Badge variant="outline" className="font-mono text-xs">
              {component.category}
            </Badge>
          </div>
          <SheetTitle className="text-base">{component.name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {component.audit_count} audit{component.audit_count !== 1 ? 's' : ''} completed
            {' | '}Last: {new Date(component.last_audit_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Score breakdown hero */}
            <div className="rounded-md bg-muted/50 p-4">
              <div className="flex items-end gap-3 mb-2">
                <span className={`text-4xl font-bold tabular-nums ${scoreColor}`}>
                  {component.health_score}
                </span>
                <span className="text-lg text-muted-foreground mb-1">
                  / {component.max_score}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${getScoreBarColor(component.health_score)}`}
                  style={{ width: `${(component.health_score / component.max_score) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`font-mono text-xs ${getLevelColors(level)}`}
                >
                  {level}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  Starting: {component.max_score} | Deducted: -{totalDeductions}
                </span>
              </div>
            </div>

            <Separator />

            {/* Deduction list */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-3">
                Deductions ({component.deductions.length})
              </h3>
              {component.deductions.length === 0 ? (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <p className="text-xs text-emerald-400">
                    No deductions — clean audit
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {component.deductions.map((deduction, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {deduction.category}
                        </span>
                        <SeverityBadge severity={deduction.severity} showPoints />
                      </div>
                      <p className="text-sm">
                        {deduction.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Maturity info */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-3">
                Maturity Criteria
              </h3>
              <div className="space-y-2">
                <MaturityCriterion
                  label="Bronze"
                  description={`< ${MATURITY_CRITERIA.silver.audits} audits`}
                  met={true}
                />
                <MaturityCriterion
                  label="Silver"
                  description={`${MATURITY_CRITERIA.silver.audits}+ audits, no Rework scores`}
                  met={component.audit_count >= MATURITY_CRITERIA.silver.audits}
                />
                <MaturityCriterion
                  label="Gold"
                  description={`${MATURITY_CRITERIA.gold.audits}+ audits, no Rework, health >= ${MATURITY_CRITERIA.gold.minHealth}`}
                  met={component.audit_count >= MATURITY_CRITERIA.gold.audits && component.health_score >= MATURITY_CRITERIA.gold.minHealth}
                />
              </div>
            </div>

            <Separator />

            {/* Score interpretation */}
            <div>
              <h3 className="font-mono text-xs font-semibold text-muted-foreground mb-3">
                Score Interpretation
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SCORE_LEVELS.map((tier, index) => {
                  const nextMin = index > 0 ? SCORE_LEVELS[index - 1].min : 101
                  const isActive = component.health_score >= tier.min && component.health_score < nextMin
                  const range = index === 0 ? `${tier.min}-100` : index < SCORE_LEVELS.length - 1 ? `${tier.min}-${nextMin - 1}` : `< ${nextMin}`
                  return (
                    <ScoreTier key={tier.label} label={tier.label} range={range} active={isActive} />
                  )
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ── Sub-components ──────────────────────────────────────

function MaturityCriterion({
  label,
  description,
  met,
}: {
  label: string
  description: string
  met: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2 w-2 rounded-full ${met ? 'bg-emerald-400' : 'bg-zinc-500/40'}`}
      />
      <span className="font-mono text-xs font-medium">{label}</span>
      <span className="font-mono text-xs text-muted-foreground">{description}</span>
    </div>
  )
}

function ScoreTier({
  label,
  range,
  active,
}: {
  label: string
  range: string
  active: boolean
}) {
  return (
    <div
      className={`rounded-md px-3 py-2 ${
        active ? 'bg-accent border border-border' : 'bg-muted/30'
      }`}
    >
      <span className={`font-mono text-xs font-medium block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className="font-mono text-xs text-muted-foreground">{range}</span>
    </div>
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

function getScoreLevel(score: number): string {
  for (const tier of SCORE_LEVELS) {
    if (score >= tier.min) return tier.label
  }
  return SCORE_LEVELS[SCORE_LEVELS.length - 1].label
}

function getLevelColors(level: string): string {
  switch (level) {
    case 'Exemplary':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'Solid':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    case 'Needs Work':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'Rework':
      return 'bg-red-500/15 text-red-400 border-red-500/30'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}
