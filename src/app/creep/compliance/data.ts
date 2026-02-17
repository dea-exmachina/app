/**
 * Mock Compliance Data
 *
 * Realistic data based on actual KERRIGAN build components.
 * Matches the scoring model from compliance-scoring.md.
 * When Supabase table is added, this file is removed — hook fetches from API instead.
 */

import type {
  ComplianceComponent,
  BenderStreak,
  ComplianceData,
  ProjectHealth,
} from './types'
import { COMPONENT_WEIGHTS, STALENESS_THRESHOLD_DAYS } from './types'

// ── Mock Components ─────────────────────────────────────

const MOCK_COMPONENTS: ComplianceComponent[] = [
  {
    name: 'CREEP Event Pipeline',
    category: 'infrastructure',
    health_score: 94,
    max_score: 100,
    maturity: 'silver',
    audit_count: 2,
    last_audit_at: '2026-02-04T10:00:00Z',
    deductions: [
      {
        category: 'Code Quality',
        description: 'One function at 45 lines (soft limit 40)',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Standards Compliance',
        description: 'Missing JSDoc on exported helper',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'CREEP Webhook Framework',
    category: 'infrastructure',
    health_score: 88,
    max_score: 100,
    maturity: 'silver',
    audit_count: 3,
    last_audit_at: '2026-02-03T14:30:00Z',
    deductions: [
      {
        category: 'Completeness',
        description: 'Missing retry logic for failed webhook delivery',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Code Quality',
        description: 'Nesting depth 4 in transform handler',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Communication',
        description: 'Undocumented design choice for HMAC validation order',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'CREEP Entity Transformation',
    category: 'integration',
    health_score: 78,
    max_score: 100,
    maturity: 'bronze',
    audit_count: 1,
    last_audit_at: '2026-02-02T09:15:00Z',
    deductions: [
      {
        category: 'Completeness',
        description: 'Edge case: empty payload not handled in Jira connector',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Scope Discipline',
        description: 'Included unused Linear connector stub',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Code Quality',
        description: 'Field mapping logic duplicated across connectors',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Standards Compliance',
        description: 'Commit message missing bullet points in body',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Communication',
        description: 'Assumptions about priority mapping not documented',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'CREEP Sync Engine',
    category: 'integration',
    health_score: 72,
    max_score: 100,
    maturity: 'bronze',
    audit_count: 1,
    last_audit_at: '2026-02-01T16:45:00Z',
    deductions: [
      {
        category: 'Code Quality',
        description: 'Circuit breaker state machine has cyclomatic complexity 12',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Completeness',
        description: 'Bidirectional sync conflict resolution not implemented',
        severity: 'critical',
        points: 10,
      },
      {
        category: 'Standards Compliance',
        description: 'Missing architecture decision record for circuit breaker pattern',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Scope Discipline',
        description: 'Added outbound push stub beyond task scope',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Communication',
        description: 'Blockers around external API rate limits not flagged',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'CREEP Standards Library',
    category: 'standards',
    health_score: 91,
    max_score: 100,
    maturity: 'silver',
    audit_count: 3,
    last_audit_at: '2026-02-05T11:00:00Z',
    deductions: [
      {
        category: 'Completeness',
        description: 'Exception process example incomplete',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Code Quality',
        description: 'Scoring model section exceeds 300-line soft limit',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Standards Compliance',
        description: 'Missing cross-reference from Golden Paths to META-FRAMEWORK',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'CREEP Compliance Scoring',
    category: 'standards',
    health_score: 87,
    max_score: 100,
    maturity: 'silver',
    audit_count: 3,
    last_audit_at: '2026-02-05T11:30:00Z',
    deductions: [
      {
        category: 'Completeness',
        description: 'Dashboard format section references unbuilt automation',
        severity: 'major',
        points: 5,
      },
      {
        category: 'Scope Discipline',
        description: 'Automated checks spec mixes requirements with implementation hints',
        severity: 'moderate',
        points: 3,
      },
      {
        category: 'Communication',
        description: 'Staleness penalty formula not fully specified',
        severity: 'minor',
        points: 2,
      },
    ],
  },
  {
    name: 'Control Center Event Dashboard',
    category: 'frontend',
    health_score: 70,
    max_score: 70,
    maturity: 'bronze',
    audit_count: 0,
    last_audit_at: '2026-02-04T08:00:00Z',
    deductions: [],
  },
  {
    name: 'Control Center Agent Monitor',
    category: 'frontend',
    health_score: 70,
    max_score: 70,
    maturity: 'bronze',
    audit_count: 0,
    last_audit_at: '2026-02-04T08:00:00Z',
    deductions: [],
  },
]

// ── Mock Bender Streaks ─────────────────────────────────

const MOCK_STREAKS: BenderStreak[] = [
  {
    role: 'frontend',
    consecutive_clean: 4,
    last_delivery_at: '2026-02-05T16:00:00Z',
  },
  {
    role: 'systems-architect',
    consecutive_clean: 2,
    last_delivery_at: '2026-02-04T14:00:00Z',
  },
  {
    role: 'integration',
    consecutive_clean: 1,
    last_delivery_at: '2026-02-03T10:00:00Z',
  },
  {
    role: 'standards',
    consecutive_clean: 3,
    last_delivery_at: '2026-02-05T12:00:00Z',
  },
  {
    role: 'researcher',
    consecutive_clean: 5,
    last_delivery_at: '2026-02-05T09:00:00Z',
  },
]

// ── Computed Project Health ─────────────────────────────

function computeProjectHealth(components: ComplianceComponent[]): ProjectHealth {
  let weightedSum = 0
  let totalWeight = 0
  let healthyCount = 0
  let needsAttentionCount = 0
  let criticalCount = 0
  let staleCount = 0

  const now = Date.now()

  for (const component of components) {
    const weight = COMPONENT_WEIGHTS[component.category]
    weightedSum += component.health_score * weight
    totalWeight += component.max_score * weight

    if (component.health_score >= 85) {
      healthyCount++
    } else if (component.health_score >= 60) {
      needsAttentionCount++
    } else {
      criticalCount++
    }

    const daysSinceAudit = Math.floor(
      (now - new Date(component.last_audit_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceAudit > STALENESS_THRESHOLD_DAYS) {
      staleCount++
    }
  }

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0

  return {
    score,
    total_components: components.length,
    healthy_count: healthyCount,
    needs_attention_count: needsAttentionCount,
    critical_count: criticalCount,
    stale_count: staleCount,
  }
}

// ── Exported Mock Data ──────────────────────────────────

export function getMockComplianceData(): ComplianceData {
  const projectHealth = computeProjectHealth(MOCK_COMPONENTS)

  return {
    components: MOCK_COMPONENTS,
    streaks: MOCK_STREAKS,
    project_health: projectHealth,
    generated_at: new Date().toISOString(),
  }
}
