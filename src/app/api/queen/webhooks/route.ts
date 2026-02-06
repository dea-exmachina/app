import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { WebhookConfig, TransformConfig } from '@/types/queen'

/**
 * GET /api/queen/webhooks — List all webhook configurations
 *
 * Returns all registered webhook sources with their enabled/disabled status
 * and transform configs. Secrets are redacted in the response.
 */
export async function GET() {
  try {
    const { data, error } = await tables.webhook_configs
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhook configs:', error)
      return NextResponse.json({ error: 'Failed to fetch webhook configs' }, { status: 500 })
    }

    // Redact secrets in the response — never expose shared secrets via API
    const configs = (data ?? []).map((config: WebhookConfig) => ({
      ...config,
      secret: config.secret ? '••••••••' : null,
    }))

    return NextResponse.json({ data: configs, cached: false })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/queen/webhooks — Register a new webhook source
 *
 * Required fields: source, endpoint_path
 * Optional fields: secret, transform_config, enabled
 *
 * The `source` must be unique — each external system gets one webhook config.
 * The `endpoint_path` is informational (the actual endpoint is always /api/webhooks/:source).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.source || typeof body.source !== 'string') {
      return NextResponse.json(
        { error: 'source is required and must be a string' },
        { status: 400 }
      )
    }

    if (!body.endpoint_path || typeof body.endpoint_path !== 'string') {
      return NextResponse.json(
        { error: 'endpoint_path is required and must be a string' },
        { status: 400 }
      )
    }

    // Sanitize source: lowercase, alphanumeric + hyphens only
    const source = body.source.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!source) {
      return NextResponse.json(
        { error: 'source must contain at least one alphanumeric character' },
        { status: 400 }
      )
    }

    // Check for duplicate source
    const { data: existing } = await tables.webhook_configs
      .select('id')
      .eq('source', source)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Webhook config for source "${source}" already exists` },
        { status: 409 }
      )
    }

    // Validate transform_config shape if provided
    const transformConfig: TransformConfig = body.transform_config || {}
    if (typeof transformConfig !== 'object' || Array.isArray(transformConfig)) {
      return NextResponse.json(
        { error: 'transform_config must be an object' },
        { status: 400 }
      )
    }

    const insertData = {
      source,
      endpoint_path: body.endpoint_path,
      secret: body.secret || null,
      enabled: body.enabled !== false, // default true
      transform_config: transformConfig,
    }

    const { data, error } = await tables.webhook_configs
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating webhook config:', error)
      return NextResponse.json({ error: 'Failed to create webhook config' }, { status: 500 })
    }

    // Redact secret in response
    const config = data as WebhookConfig
    return NextResponse.json(
      {
        data: {
          ...config,
          secret: config.secret ? '••••••••' : null,
        },
        cached: false,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
