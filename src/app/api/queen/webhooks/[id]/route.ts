import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import type { WebhookConfig, TransformConfig } from '@/types/queen'

/**
 * PUT /api/queen/webhooks/:id — Update a webhook configuration
 *
 * Updatable fields: secret, enabled, transform_config, endpoint_path
 * The `source` field is immutable after creation (it's the identity).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params // Next.js 16: async params

  try {
    // Verify the webhook config exists
    const { data: existing, error: fetchError } = await tables.webhook_configs
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: `Webhook config "${id}" not found` },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Build update payload — only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.secret !== undefined) {
      // Allow setting secret to null (remove secret) or a new value
      updateData.secret = body.secret || null
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'enabled must be a boolean' },
          { status: 400 }
        )
      }
      updateData.enabled = body.enabled
    }

    if (body.endpoint_path !== undefined) {
      if (typeof body.endpoint_path !== 'string' || !body.endpoint_path) {
        return NextResponse.json(
          { error: 'endpoint_path must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.endpoint_path = body.endpoint_path
    }

    if (body.transform_config !== undefined) {
      if (typeof body.transform_config !== 'object' || Array.isArray(body.transform_config)) {
        return NextResponse.json(
          { error: 'transform_config must be an object' },
          { status: 400 }
        )
      }
      // Merge with existing transform_config rather than replacing
      // This allows partial updates (e.g., just updating status_map)
      const existingConfig = (existing as WebhookConfig).transform_config || {}
      const mergedConfig: TransformConfig = {
        ...existingConfig,
        ...body.transform_config,
      }
      updateData.transform_config = mergedConfig
    }

    const { data, error } = await tables.webhook_configs
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating webhook config:', error)
      return NextResponse.json({ error: 'Failed to update webhook config' }, { status: 500 })
    }

    // Redact secret in response
    const config = data as WebhookConfig
    return NextResponse.json({
      data: {
        ...config,
        secret: config.secret ? '••••••••' : null,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
