/**
 * Entity Transformation Pipeline Orchestrator
 *
 * Orchestrates the full transformation pipeline:
 *   raw webhook payload -> connector extract -> connector transform -> InternalEntity
 *
 * This module is the public API for entity transformation. Consumers call
 * `transformEntity()` or `transformWebhookEvent()` — they don't interact
 * with connectors directly.
 *
 * Pipeline stages:
 * 1. Connector resolution — find the right connector for the source/payload
 * 2. Extraction — pull fields from raw payload (connector-specific logic)
 * 3. Transformation — apply status mapping, priority normalization (config-driven)
 * 4. Validation — verify the result meets minimum quality bar
 *
 * Error philosophy:
 * - Partial extraction always succeeds (extract what you can, warn on missing)
 * - Pipeline-level errors are reserved for "can't even start" situations
 * - Every result carries diagnostics in _meta for observability
 *
 * TASK-010 | Phase 2 Entity Transformation Layer
 */

import type {
  InternalEntity,
  TransformResult,
  TransformConfig,
} from '@/types/creep'
import {
  getConnector,
  findConnectorForPayload,
} from './connectors'

// ── Public API ───────────────────────────────────────────────

/**
 * Transform a raw webhook payload into an InternalEntity.
 *
 * This is the primary entry point for entity transformation.
 * Resolves the connector, runs extraction, then transformation.
 *
 * @param source - The webhook source identifier (e.g., "jira", "linear")
 * @param payload - The raw webhook JSON payload
 * @param config - The TransformConfig from webhook_configs (field overrides)
 * @returns TransformResult with the entity and diagnostics
 */
export function transformEntity(
  source: string,
  payload: Record<string, unknown>,
  config: TransformConfig
): TransformResult {
  // ── Stage 1: Resolve connector ──
  const entry = getConnector(source)

  if (!entry) {
    // Try auto-detection from payload structure
    const detected = findConnectorForPayload(payload)
    if (!detected) {
      return {
        success: false,
        errors: [
          `No connector found for source "${source}". ` +
          `Either register a connector with this name or ensure the payload ` +
          `matches a registered connector's canHandle() check.`,
        ],
      }
    }
    // Use detected connector but log the mismatch
    return runPipeline(detected.connector.name, payload, config, detected)
  }

  return runPipeline(source, payload, config, entry)
}

/**
 * Transform a webhook event payload that includes source metadata.
 *
 * Convenience wrapper for `transformEntity()` that extracts source
 * and raw payload from the event's payload envelope.
 *
 * Expected payload structure (from webhook receiver's emitted event):
 * {
 *   raw: { ...original webhook payload },
 *   extracted: { ...fields from webhooks.ts transformWebhookPayload },
 *   webhook_source: "jira",
 *   received_at: "2026-02-06T..."
 * }
 *
 * @param eventPayload - The CreepEvent.payload from a webhook.received event
 * @param config - The TransformConfig from webhook_configs
 * @returns TransformResult with the entity and diagnostics
 */
export function transformWebhookEvent(
  eventPayload: Record<string, unknown>,
  config: TransformConfig
): TransformResult {
  const webhookSource = eventPayload.webhook_source
  if (typeof webhookSource !== 'string' || !webhookSource) {
    return {
      success: false,
      errors: ['Missing webhook_source in event payload'],
    }
  }

  const rawPayload = eventPayload.raw
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      success: false,
      errors: ['Missing or invalid raw payload in event payload'],
    }
  }

  return transformEntity(
    webhookSource,
    rawPayload as Record<string, unknown>,
    config
  )
}

// ── Pipeline Internals ───────────────────────────────────────

/**
 * Run the two-phase extraction + transformation pipeline.
 */
function runPipeline(
  source: string,
  payload: Record<string, unknown>,
  config: TransformConfig,
  entry: { connector: { extract: (p: Record<string, unknown>, c: TransformConfig) => import('@/types/creep').ExtractionResult; transform: (e: InternalEntity, c: TransformConfig) => InternalEntity } }
): TransformResult {
  // ── Stage 2: Extract ──
  let extractionResult
  try {
    extractionResult = entry.connector.extract(payload, config)
  } catch (err) {
    return {
      success: false,
      errors: [
        `Extraction failed for source "${source}": ` +
        (err instanceof Error ? err.message : String(err)),
      ],
    }
  }

  if (!extractionResult.success || !extractionResult.entity) {
    return {
      success: false,
      errors: extractionResult.errors.length > 0
        ? extractionResult.errors
        : [`Extraction returned no entity for source "${source}"`],
    }
  }

  // ── Stage 3: Transform ──
  let entity: InternalEntity
  try {
    entity = entry.connector.transform(extractionResult.entity, config)
  } catch (err) {
    // Transformation failed — return the extracted entity with a warning
    // rather than failing the whole pipeline. Partial data > no data.
    extractionResult.entity._meta.warnings.push(
      `Transform failed: ${err instanceof Error ? err.message : String(err)}. ` +
      `Returning raw extraction result.`
    )
    return {
      success: true,
      entity: extractionResult.entity,
      errors: [],
    }
  }

  // ── Stage 4: Post-transform validation ──
  const validationErrors = validateEntity(entity)
  if (validationErrors.length > 0) {
    entity._meta.warnings.push(...validationErrors)
    entity._meta.partial = true
  }

  return {
    success: true,
    entity,
    errors: [],
  }
}

/**
 * Post-transform validation — checks the entity meets minimum quality bar.
 * Returns warnings (not errors) — a valid entity always has at least external_id + source.
 */
function validateEntity(entity: InternalEntity): string[] {
  const warnings: string[] = []

  if (!entity.external_id) {
    warnings.push('validation: external_id is empty after transformation')
  }

  if (!entity.source) {
    warnings.push('validation: source is empty after transformation')
  }

  if (!entity.title) {
    warnings.push('validation: title is missing — entity may not display well in kanban')
  }

  return warnings
}
