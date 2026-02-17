/**
 * CREEP Webhook Utilities
 *
 * Signature verification, payload field extraction, and transform helpers
 * for the generic webhook receiver framework.
 *
 * Design:
 * - Platform-agnostic HMAC verification using Node.js built-in crypto
 * - Dot-notation field extraction for flexible payload mapping
 * - Transform pipeline: raw payload → extracted fields → CreepEvent
 *
 * TASK-009 | Phase 2 Integration Layer
 */

import { createHmac, timingSafeEqual } from 'crypto'
import type { TransformConfig, WebhookConfig } from '@/types/creep'
import { tables } from '@/lib/server/database'

// ── Signature Verification ────────────────────────────────────

/**
 * Platform-specific header names for webhook signatures.
 * Each platform sends its HMAC signature in a different header.
 */
const SIGNATURE_HEADERS: Record<string, string> = {
  github: 'x-hub-signature-256',
  jira: 'x-hub-signature',
  linear: 'linear-signature',
}

/** Default header for sources without a platform-specific mapping */
const DEFAULT_SIGNATURE_HEADER = 'x-webhook-signature'

/**
 * Platform-specific signature prefixes to strip before comparison.
 * GitHub sends "sha256=abc123...", Jira sends "sha256=abc123...".
 */
const SIGNATURE_PREFIXES: Record<string, string> = {
  github: 'sha256=',
  jira: 'sha256=',
}

/**
 * Verify an HMAC webhook signature against the raw payload.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 * Defaults to SHA-256 — the standard for most webhook providers.
 *
 * @param payload - The raw request body string (must match exactly what was signed)
 * @param signature - The hex-encoded HMAC signature from the webhook header
 * @param secret - The shared secret configured for this webhook source
 * @param algorithm - Hash algorithm (default: 'sha256')
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  if (!payload || !signature || !secret) return false

  try {
    const expected = createHmac(algorithm, secret).update(payload).digest('hex')

    // Use timing-safe comparison to prevent timing attacks.
    // Both buffers must be the same length for timingSafeEqual.
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expected, 'hex')

    if (sigBuffer.length !== expectedBuffer.length) return false

    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    // Any crypto error (bad algorithm, malformed input) = invalid signature
    return false
  }
}

/**
 * Extract the HMAC signature from request headers for a given source.
 *
 * Handles platform-specific header names and prefix stripping:
 * - GitHub: X-Hub-Signature-256 → strip "sha256=" prefix
 * - Jira: X-Hub-Signature → strip "sha256=" prefix
 * - Linear: Linear-Signature → raw value
 * - Generic: X-Webhook-Signature → raw value
 *
 * @param headers - The request Headers object
 * @param source - The webhook source identifier (e.g., "github", "jira", "linear")
 * @returns The hex-encoded signature string, or null if not found
 */
export function extractSignature(headers: Headers, source: string): string | null {
  const headerName = SIGNATURE_HEADERS[source] || DEFAULT_SIGNATURE_HEADER
  const rawValue = headers.get(headerName)

  if (!rawValue) return null

  // Strip platform-specific prefixes (e.g., "sha256=" from GitHub/Jira)
  const prefix = SIGNATURE_PREFIXES[source]
  if (prefix && rawValue.startsWith(prefix)) {
    return rawValue.slice(prefix.length)
  }

  return rawValue
}

// ── Payload Field Extraction ──────────────────────────────────

/**
 * Extract a nested field from an object using dot-notation path.
 *
 * Examples:
 *   getNestedField({ fields: { summary: "Bug" } }, "fields.summary") → "Bug"
 *   getNestedField({ a: { b: { c: 42 } } }, "a.b.c") → 42
 *   getNestedField({ x: 1 }, "y.z") → undefined
 *
 * @param obj - The source object to extract from
 * @param path - Dot-notation path (e.g., "fields.summary", "issue.key")
 * @returns The value at the path, or undefined if not found
 */
export function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined

  const segments = path.split('.')
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return current
}

// ── Transform Pipeline ────────────────────────────────────────

/**
 * Result of transforming a raw webhook payload using a TransformConfig.
 */
export interface WebhookTransformResult {
  /** Human-readable summary built from extracted fields */
  summary: string
  /** All fields extracted using the transform_config mappings */
  extractedFields: Record<string, unknown>
}

/**
 * Transform a raw webhook payload into a structured summary using the
 * webhook's transform_config.
 *
 * Extracts fields defined in the TransformConfig using dot-notation paths,
 * applies status mapping if configured, and builds a human-readable summary.
 *
 * @param source - The webhook source identifier (used in the summary prefix)
 * @param payload - The raw webhook payload
 * @param config - The TransformConfig from the webhook_configs table
 * @returns An object with `summary` and `extractedFields`
 */
export function transformWebhookPayload(
  source: string,
  payload: Record<string, unknown>,
  config: TransformConfig
): WebhookTransformResult {
  const extractedFields: Record<string, unknown> = {}

  // Extract title
  if (config.title_field) {
    extractedFields.title = getNestedField(payload, config.title_field)
  }

  // Extract description
  if (config.description_field) {
    extractedFields.description = getNestedField(payload, config.description_field)
  }

  // Extract and map status
  if (config.status_map) {
    // Try common status field paths if no explicit status field is in the config
    // The status_map keys are the external values, values are our internal values
    const statusPaths = ['status', 'fields.status.name', 'fields.status', 'state']
    let rawStatus: unknown

    for (const path of statusPaths) {
      rawStatus = getNestedField(payload, path)
      if (rawStatus !== undefined) break
    }

    if (typeof rawStatus === 'string' && config.status_map[rawStatus]) {
      extractedFields.status = config.status_map[rawStatus]
      extractedFields.raw_status = rawStatus
    } else {
      extractedFields.raw_status = rawStatus
    }
  }

  // Extract priority
  if (config.priority_field) {
    extractedFields.priority = getNestedField(payload, config.priority_field)
  }

  // Extract tags from multiple fields
  if (config.tag_fields && config.tag_fields.length > 0) {
    const tags: unknown[] = []
    for (const tagField of config.tag_fields) {
      const value = getNestedField(payload, tagField)
      if (Array.isArray(value)) {
        tags.push(...value)
      } else if (value !== undefined && value !== null) {
        tags.push(value)
      }
    }
    if (tags.length > 0) {
      extractedFields.tags = tags
    }
  }

  // Build human-readable summary
  const title = extractedFields.title
  const status = extractedFields.status || extractedFields.raw_status
  const summaryParts: string[] = [`[${source}]`]

  if (typeof title === 'string' && title.trim()) {
    summaryParts.push(title.trim())
  } else {
    summaryParts.push('webhook received')
  }

  if (status) {
    summaryParts.push(`(${status})`)
  }

  return {
    summary: summaryParts.join(' '),
    extractedFields,
  }
}

// ── Config Lookup ─────────────────────────────────────────────

/**
 * Look up a webhook configuration by source name.
 *
 * @param source - The source identifier (matches the URL path segment)
 * @returns The WebhookConfig, or null if not found
 */
export async function getWebhookConfig(source: string): Promise<WebhookConfig | null> {
  const { data, error } = await tables.webhook_configs
    .select('*')
    .eq('source', source)
    .single()

  if (error || !data) return null

  return data as WebhookConfig
}
