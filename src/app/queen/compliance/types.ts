/**
 * Compliance Scorecard Types
 *
 * Local types for the compliance scoring dashboard.
 * Based on the deductive scoring model from compliance-scoring.md.
 * When a Supabase table is added, these types stay — the hook swaps the data source.
 */

// ── Severity & Maturity Enums ───────────────────────────

export type Severity = 'critical' | 'major' | 'moderate' | 'minor'

export type MaturityLevel = 'bronze' | 'silver' | 'gold'

export type ComponentCategory = 'infrastructure' | 'integration' | 'standards' | 'frontend'

// ── Scoring Constants ───────────────────────────────────

/** Deduction points per severity tier */
export const SEVERITY_POINTS: Record<Severity, number> = {
  critical: 10,
  major: 5,
  moderate: 3,
  minor: 2,
}

/** Score thresholds for color coding */
export const SCORE_THRESHOLDS = {
  green: 85,
  yellow: 70,
  orange: 50,
} as const

/** Component type weights for project health aggregation */
export const COMPONENT_WEIGHTS: Record<ComponentCategory, number> = {
  infrastructure: 1.5,
  integration: 1.2,
  standards: 1.0,
  frontend: 0.8,
}

/** Staleness threshold in days */
export const STALENESS_THRESHOLD_DAYS = 90

// ── Core Data Types ─────────────────────────────────────

export interface ComplianceDeduction {
  category: string
  description: string
  severity: Severity
  points: number
}

export interface ComplianceComponent {
  name: string
  category: ComponentCategory
  health_score: number
  max_score: number
  maturity: MaturityLevel
  audit_count: number
  last_audit_at: string
  deductions: ComplianceDeduction[]
}

export interface BenderStreak {
  role: string
  consecutive_clean: number
  last_delivery_at: string
}

// ── Aggregate Types ─────────────────────────────────────

export interface ProjectHealth {
  score: number
  total_components: number
  healthy_count: number
  needs_attention_count: number
  critical_count: number
  stale_count: number
}

export interface ComplianceData {
  components: ComplianceComponent[]
  streaks: BenderStreak[]
  project_health: ProjectHealth
  generated_at: string
}
