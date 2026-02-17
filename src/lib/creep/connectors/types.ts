/**
 * Connector Interface — Shared contract for all entity connectors
 *
 * Every external system connector implements this interface.
 * The two-step design (extract then transform) allows:
 * - Validation at each boundary
 * - Partial extraction to succeed
 * - Debugging by inspecting intermediate state
 *
 * Adding a new connector:
 * 1. Create `src/lib/creep/connectors/{name}.ts`
 * 2. Implement `EntityConnector` interface
 * 3. Register in `src/lib/creep/connectors/index.ts`
 *
 * TASK-010 | Phase 2 Entity Transformation Layer
 */

import type {
  InternalEntity,
  ExtractionResult,
  ConnectorConfig,
  TransformConfig,
} from '@/types/creep'

/**
 * The contract every connector must implement.
 *
 * Two-phase design:
 * - `extract()`: Pull fields from raw webhook payload into InternalEntity shape.
 *   This is where connector-specific knowledge lives (field paths, nested structures).
 * - `transform()`: Apply status mapping, priority normalization, and any business
 *   rules to the extracted entity. Uses the TransformConfig from webhook_configs.
 *
 * Both methods must handle missing/malformed data gracefully — add warnings
 * to `_meta.warnings` rather than throwing.
 */
export interface EntityConnector {
  /** Unique connector name (e.g., "jira", "linear", "gcal") */
  readonly name: string

  /** Human-readable connector description */
  readonly description: string

  /**
   * Extract fields from a raw webhook payload into an InternalEntity.
   *
   * This step is payload-structure-aware — it knows where fields live
   * in the external system's payload format.
   *
   * Must succeed if at least `external_id` can be extracted.
   * Missing fields should produce warnings, not errors.
   *
   * @param payload - The raw webhook JSON payload
   * @param config - The transform config from webhook_configs (field overrides)
   * @returns ExtractionResult with the entity and any warnings/errors
   */
  extract(
    payload: Record<string, unknown>,
    config: TransformConfig
  ): ExtractionResult

  /**
   * Apply status mapping, priority normalization, and business rules
   * to an extracted entity.
   *
   * This step is config-driven — it uses the TransformConfig's status_map
   * and other mappings to translate external values to internal ones.
   *
   * @param entity - The entity from the extract step
   * @param config - The transform config with status_map, priority mappings, etc.
   * @returns The transformed entity (same reference, mutated in place for efficiency)
   */
  transform(
    entity: InternalEntity,
    config: TransformConfig
  ): InternalEntity

  /**
   * Validate that this connector can handle a given payload.
   *
   * Quick check used by the registry to route payloads to the right connector.
   * Should be fast — inspect top-level fields only, don't deep-parse.
   *
   * @param payload - The raw webhook JSON payload
   * @returns true if this connector can process the payload
   */
  canHandle(payload: Record<string, unknown>): boolean
}

/**
 * Registry entry for a registered connector.
 * Pairs the connector implementation with its runtime configuration.
 */
export interface ConnectorRegistryEntry {
  connector: EntityConnector
  config: ConnectorConfig
}
