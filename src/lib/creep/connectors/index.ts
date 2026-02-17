/**
 * Connector Registry — Central registry for all entity connectors
 *
 * Manages connector registration, lookup, and routing.
 * Adding a new connector is three steps:
 * 1. Implement EntityConnector in a new file
 * 2. Import and register here
 * 3. Add a webhook_config entry in Supabase
 *
 * The registry supports two lookup modes:
 * - By name: for known sources (e.g., webhook_config says "jira")
 * - By payload: auto-detect which connector handles a payload
 *
 * TASK-010 | Phase 2 Entity Transformation Layer
 */

import type { EntityConnector, ConnectorRegistryEntry } from './types'
import type { ConnectorConfig } from '@/types/creep'
import { jiraConnector } from './jira'

// ── Registry State ───────────────────────────────────────────

const registry = new Map<string, ConnectorRegistryEntry>()

// ── Registration ─────────────────────────────────────────────

/**
 * Register a connector with its runtime configuration.
 *
 * @param connector - The connector implementation
 * @param config - Runtime configuration (enabled state, transform overrides)
 */
export function registerConnector(
  connector: EntityConnector,
  config: ConnectorConfig
): void {
  registry.set(connector.name, { connector, config })
}

/**
 * Remove a connector from the registry.
 * @returns true if the connector was found and removed
 */
export function unregisterConnector(name: string): boolean {
  return registry.delete(name)
}

// ── Lookup ───────────────────────────────────────────────────

/**
 * Get a connector by name.
 * @returns The connector entry, or undefined if not found or disabled
 */
export function getConnector(name: string): ConnectorRegistryEntry | undefined {
  const entry = registry.get(name)
  if (!entry || !entry.config.enabled) return undefined
  return entry
}

/**
 * Find a connector that can handle a given payload.
 * Iterates registered connectors and returns the first enabled one
 * whose `canHandle()` returns true.
 *
 * @param payload - The raw webhook JSON payload
 * @returns The matching connector entry, or undefined
 */
export function findConnectorForPayload(
  payload: Record<string, unknown>
): ConnectorRegistryEntry | undefined {
  for (const entry of registry.values()) {
    if (!entry.config.enabled) continue
    if (entry.connector.canHandle(payload)) return entry
  }
  return undefined
}

/**
 * List all registered connectors (for debugging / admin endpoints).
 */
export function listConnectors(): Array<{
  name: string
  description: string
  enabled: boolean
}> {
  const result: Array<{ name: string; description: string; enabled: boolean }> = []
  for (const entry of registry.values()) {
    result.push({
      name: entry.connector.name,
      description: entry.connector.description,
      enabled: entry.config.enabled,
    })
  }
  return result
}

/**
 * Check if a connector is registered (regardless of enabled state).
 */
export function hasConnector(name: string): boolean {
  return registry.has(name)
}

// ── Default Registration ─────────────────────────────────────
// Register built-in connectors with default configs.
// Connectors start enabled with empty transform configs —
// actual field mappings come from webhook_configs in Supabase at runtime.

registerConnector(jiraConnector, {
  connector: 'jira',
  enabled: true,
  transform: {},
})

// ── Re-exports ───────────────────────────────────────────────

export { jiraConnector } from './jira'
export type { EntityConnector, ConnectorRegistryEntry } from './types'
