/**
 * Circuit Breaker — Per-source failure tracking and auto-recovery
 *
 * Protects the sync engine from hammering a degraded external system.
 * Each external source (e.g., "jira", "linear") gets its own breaker.
 *
 * State transitions:
 *   closed (healthy) --[failure_threshold reached]--> open (blocked)
 *   open (blocked)   --[cooldown elapsed]-----------> half-open (probing)
 *   half-open        --[success]--------------------> closed (healthy)
 *   half-open        --[failure]--------------------> open (blocked, reset cooldown)
 *
 * Design:
 * - In-memory state — breakers reset on deploy. This is intentional:
 *   a deploy is a fresh start, and if the external system recovered
 *   during downtime, we should try it.
 * - Per-source granularity — if Jira is down, all Jira syncs pause,
 *   but Linear syncs continue unaffected.
 * - No persistent state — avoids database round-trips on every sync check.
 *
 * TASK-011 | Phase 2 Bidirectional Sync Engine
 */

import type { CircuitBreakerState, CircuitBreakerStatus } from '@/types/queen'

// ── Configuration ────────────────────────────────────────────

/** Default number of consecutive failures before opening the circuit */
const DEFAULT_FAILURE_THRESHOLD = 5

/** Default cooldown period (ms) before transitioning from open to half-open */
const DEFAULT_COOLDOWN_MS = 60_000 // 1 minute

// ── Internal State ───────────────────────────────────────────

interface BreakerState {
  state: CircuitBreakerState
  failureCount: number
  failureThreshold: number
  cooldownMs: number
  lastFailureAt: string | null
  lastTransitionAt: string
}

const breakers = new Map<string, BreakerState>()

// ── Helpers ──────────────────────────────────────────────────

function getOrCreateBreaker(
  source: string,
  options?: { failureThreshold?: number; cooldownMs?: number }
): BreakerState {
  let breaker = breakers.get(source)
  if (!breaker) {
    breaker = {
      state: 'closed',
      failureCount: 0,
      failureThreshold: options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD,
      cooldownMs: options?.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      lastFailureAt: null,
      lastTransitionAt: new Date().toISOString(),
    }
    breakers.set(source, breaker)
  }
  return breaker
}

function transitionTo(breaker: BreakerState, newState: CircuitBreakerState): void {
  breaker.state = newState
  breaker.lastTransitionAt = new Date().toISOString()
}

// ── Public API ───────────────────────────────────────────────

/**
 * Check whether requests to this source are currently allowed.
 *
 * Handles the open -> half-open transition when cooldown has elapsed.
 * Call this before attempting any sync operation against an external source.
 *
 * @param source - The external source identifier (e.g., "jira")
 * @returns true if the request should proceed, false if blocked
 */
export function isSourceAllowed(source: string): boolean {
  const breaker = getOrCreateBreaker(source)

  switch (breaker.state) {
    case 'closed':
      return true

    case 'half-open':
      // Allow one probe request through
      return true

    case 'open': {
      // Check if cooldown has elapsed
      if (!breaker.lastFailureAt) {
        // Should not happen, but fail-safe: allow the request
        transitionTo(breaker, 'half-open')
        return true
      }

      const elapsed = Date.now() - new Date(breaker.lastFailureAt).getTime()
      if (elapsed >= breaker.cooldownMs) {
        transitionTo(breaker, 'half-open')
        return true
      }

      // Still within cooldown — block the request
      return false
    }

    default:
      return true
  }
}

/**
 * Record a successful sync operation for a source.
 *
 * In closed state: resets failure count (consecutive failures broken).
 * In half-open state: transitions back to closed (source recovered).
 *
 * @param source - The external source identifier
 */
export function recordSuccess(source: string): void {
  const breaker = getOrCreateBreaker(source)

  breaker.failureCount = 0

  if (breaker.state === 'half-open') {
    transitionTo(breaker, 'closed')
  }
}

/**
 * Record a failed sync operation for a source.
 *
 * In closed state: increments failure count. If threshold reached, opens circuit.
 * In half-open state: immediately re-opens circuit (probe failed).
 *
 * @param source - The external source identifier
 */
export function recordFailure(source: string): void {
  const breaker = getOrCreateBreaker(source)

  breaker.failureCount++
  breaker.lastFailureAt = new Date().toISOString()

  if (breaker.state === 'half-open') {
    // Probe failed — back to open
    transitionTo(breaker, 'open')
    return
  }

  if (breaker.state === 'closed' && breaker.failureCount >= breaker.failureThreshold) {
    transitionTo(breaker, 'open')
  }
}

/**
 * Get the current status of a source's circuit breaker.
 *
 * @param source - The external source identifier
 * @returns CircuitBreakerStatus or null if no breaker exists for this source
 */
export function getBreakerStatus(source: string): CircuitBreakerStatus | null {
  const breaker = breakers.get(source)
  if (!breaker) return null

  return {
    source,
    state: breaker.state,
    failure_count: breaker.failureCount,
    failure_threshold: breaker.failureThreshold,
    last_failure_at: breaker.lastFailureAt,
    cooldown_ms: breaker.cooldownMs,
    last_transition_at: breaker.lastTransitionAt,
  }
}

/**
 * Get status of all circuit breakers.
 */
export function getAllBreakerStatuses(): CircuitBreakerStatus[] {
  const statuses: CircuitBreakerStatus[] = []

  for (const [source, breaker] of breakers.entries()) {
    statuses.push({
      source,
      state: breaker.state,
      failure_count: breaker.failureCount,
      failure_threshold: breaker.failureThreshold,
      last_failure_at: breaker.lastFailureAt,
      cooldown_ms: breaker.cooldownMs,
      last_transition_at: breaker.lastTransitionAt,
    })
  }

  return statuses
}

/**
 * Configure a circuit breaker for a specific source.
 *
 * Call this at application startup to customize thresholds per source.
 * If not called, defaults are used when the breaker is first created.
 *
 * @param source - The external source identifier
 * @param options - Configuration overrides
 */
export function configureBreaker(
  source: string,
  options: { failureThreshold?: number; cooldownMs?: number }
): void {
  const breaker = getOrCreateBreaker(source, options)
  if (options.failureThreshold !== undefined) {
    breaker.failureThreshold = options.failureThreshold
  }
  if (options.cooldownMs !== undefined) {
    breaker.cooldownMs = options.cooldownMs
  }
}

/**
 * Force-reset a circuit breaker to closed state.
 *
 * Use for manual recovery when you know the external system is back.
 *
 * @param source - The external source identifier
 * @returns true if a breaker existed and was reset
 */
export function resetBreaker(source: string): boolean {
  const breaker = breakers.get(source)
  if (!breaker) return false

  breaker.failureCount = 0
  breaker.lastFailureAt = null
  transitionTo(breaker, 'closed')

  return true
}
