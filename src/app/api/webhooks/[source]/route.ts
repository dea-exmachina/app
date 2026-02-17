import { NextRequest, NextResponse } from 'next/server'
import { emitEvent, EVENT_TYPES, EventEmitError } from '@/lib/creep'
import {
  getWebhookConfig,
  extractSignature,
  verifyWebhookSignature,
  transformWebhookPayload,
} from '@/lib/creep/webhooks'

/**
 * POST /api/webhooks/:source — Generic webhook receiver
 *
 * The single entry point for all external webhook deliveries.
 * External systems (Jira, Linear, GitHub, etc.) are configured to POST here.
 *
 * Processing pipeline:
 * 1. Look up webhook_config for the source
 * 2. If not found or disabled → 404/410
 * 3. If secret configured → verify HMAC signature → 401 on failure
 * 4. Parse JSON payload
 * 5. Transform payload using transform_config (if configured)
 * 6. Emit webhook.received event via emitEvent()
 * 7. Return { received: true } immediately
 *
 * CRITICAL: Always return 200 quickly. External systems will retry on non-200.
 * Heavy processing happens asynchronously in the consumer pipeline.
 *
 * TASK-009 | Phase 2 Integration Layer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params // Next.js 16: async params

  // ── Step 1: Look up webhook config ───────────────────────
  let config
  try {
    config = await getWebhookConfig(source)
  } catch (err) {
    // Database unreachable — log but still return 200 to avoid retries
    // that would flood us during an outage
    console.error(`[WEBHOOK] Database error looking up config for "${source}":`, err)
    return NextResponse.json(
      { received: true, warning: 'config lookup failed, payload not processed' },
      { status: 200 }
    )
  }

  if (!config) {
    return NextResponse.json(
      { error: `No webhook configured for source "${source}"` },
      { status: 404 }
    )
  }

  if (!config.enabled) {
    return NextResponse.json(
      { error: `Webhook for source "${source}" is disabled` },
      { status: 410 }
    )
  }

  // ── Step 2: Read raw body (needed for signature verification) ──
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  if (!rawBody) {
    return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
  }

  // ── Step 3: Verify HMAC signature (if secret configured) ──
  if (config.secret) {
    const signature = extractSignature(request.headers, source)

    if (!signature) {
      console.warn(`[WEBHOOK] Missing signature for source "${source}"`)
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 })
    }

    const valid = verifyWebhookSignature(rawBody, signature, config.secret)

    if (!valid) {
      console.warn(`[WEBHOOK] Invalid signature for source "${source}"`)
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }
  }

  // ── Step 4: Parse JSON payload ────────────────────────────
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  // ── Step 5: Transform payload ─────────────────────────────
  const transformConfig = config.transform_config || {}
  const hasTransformRules = Object.keys(transformConfig).length > 0

  let summary: string
  let extractedFields: Record<string, unknown> = {}

  if (hasTransformRules) {
    const result = transformWebhookPayload(source, payload, transformConfig)
    summary = result.summary
    extractedFields = result.extractedFields
  } else {
    // No transform config — build a basic summary from common fields
    const title =
      (payload.title as string) ||
      (payload.name as string) ||
      (payload.subject as string) ||
      (payload.action as string)
    summary = title
      ? `[${source}] ${title}`
      : `[${source}] webhook received`
  }

  // ── Step 6: Emit event ────────────────────────────────────
  // The webhook source in the event uses the "webhook.{source}" convention
  // to match VALID_SOURCES (e.g., "webhook.jira", "webhook.linear").
  const eventSource = `webhook.${source}`

  try {
    await emitEvent({
      type: EVENT_TYPES.webhook.received,
      source: eventSource,
      summary,
      payload: {
        raw: payload,
        extracted: extractedFields,
        webhook_source: source,
        received_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    // Event emission failed — most likely a source validation error
    // (the webhook source isn't in VALID_SOURCES) or a database error.
    //
    // CRITICAL: Still return 200 to the external system. We don't want
    // retries flooding us because of an internal validation issue.
    // Log the error for operator visibility.
    if (err instanceof EventEmitError) {
      console.error(
        `[WEBHOOK] Event emission failed for "${source}": ${err.message}`,
        err.validationErrors || ''
      )
    } else {
      console.error(`[WEBHOOK] Unexpected error emitting event for "${source}":`, err)
    }

    // Return 200 with a warning flag so callers with visibility can see the issue
    return NextResponse.json({
      received: true,
      warning: 'payload received but event emission failed — check server logs',
    })
  }

  // ── Step 7: Acknowledge ───────────────────────────────────
  return NextResponse.json({ received: true })
}
