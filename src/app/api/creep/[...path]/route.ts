import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'
import { processEvents } from '@/lib/creep/consumer'
import {
  listSyncStates,
  triggerManualSync,
  getAllBreakerStatuses,
  getSyncState,
  resolveConflict,
  updateSyncState,
  resetBreaker,
  processOutboundChange,
} from '@/lib/creep/sync'
import type {
  AgentHealthUpdate,
  CreepEventCreate,
  SyncState,
  WebhookConfig,
  TransformConfig,
} from '@/types/creep'

const DEFAULT_STUCK_THRESHOLD = 900 // 15 minutes in seconds

// ---------------------------------------------------------------------------
// Route: GET /api/creep/agents
// ---------------------------------------------------------------------------
async function handleAgentsList() {
  try {
    const { data: agents, error } = await tables.agent_health
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching agent health:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Stuck detection: check each active agent
    const now = Date.now()
    const stuckAgents: string[] = []

    for (const agent of agents ?? []) {
      if (agent.status === 'active' || agent.status === 'idle') {
        const lastActivity = new Date(agent.last_activity_at).getTime()
        const threshold = (agent.metrics as Record<string, unknown>)?.stuck_threshold as number || DEFAULT_STUCK_THRESHOLD
        const idleSeconds = (now - lastActivity) / 1000

        if (idleSeconds > threshold) {
          stuckAgents.push(agent.agent_name)
          await tables.agent_health
            .update({ status: 'stuck', updated_at: new Date().toISOString() })
            .eq('agent_name', agent.agent_name)
          await tables.queen_events.insert({
            type: 'agent.stuck',
            source: 'system',
            actor: agent.agent_name,
            summary: `Agent ${agent.agent_name} stuck — idle for ${Math.round(idleSeconds)}s (threshold: ${threshold}s)`,
            payload: { idle_seconds: Math.round(idleSeconds), threshold, platform: agent.platform },
          })
        }
      }
    }

    // Re-fetch if any were updated
    const { data: refreshed } = stuckAgents.length > 0
      ? await tables.agent_health.select('*').order('updated_at', { ascending: false })
      : { data: agents }

    return NextResponse.json({
      data: refreshed ?? [],
      stuck_detected: stuckAgents,
      cached: false,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: PUT /api/creep/agents/:name
// ---------------------------------------------------------------------------
async function handleAgentUpdate(request: NextRequest, name: string) {
  try {
    const body: AgentHealthUpdate = await request.json()

    const updateData: Record<string, unknown> = {
      agent_name: name,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    }

    if (body.status) updateData.status = body.status
    if (body.current_task !== undefined) updateData.current_task = body.current_task
    if (body.metrics) updateData.metrics = body.metrics

    const { data: existing } = await tables.agent_health
      .select('id')
      .eq('agent_name', name)
      .single()

    let result
    if (existing) {
      const { data, error } = await tables.agent_health
        .update(updateData)
        .eq('agent_name', name)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      if (!updateData.platform) updateData.platform = 'unknown'
      const { data, error } = await tables.agent_health
        .insert(updateData)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return NextResponse.json({ data: result, cached: false })
  } catch (error) {
    console.error('Error updating agent health:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: POST /api/creep/agents/:name/heartbeat
// ---------------------------------------------------------------------------
async function handleAgentHeartbeat(name: string) {
  try {
    const now = new Date().toISOString()

    const { data: existing } = await tables.agent_health
      .select('id, status')
      .eq('agent_name', name)
      .single()

    if (existing) {
      const updateData: Record<string, unknown> = {
        last_activity_at: now,
        updated_at: now,
      }
      if (existing.status === 'stuck' || existing.status === 'idle') {
        updateData.status = 'active'
      }
      await tables.agent_health
        .update(updateData)
        .eq('agent_name', name)
    } else {
      await tables.agent_health.insert({
        agent_name: name,
        platform: 'unknown',
        status: 'active',
        last_activity_at: now,
        updated_at: now,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error recording heartbeat:', error)
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: GET /api/creep/events
// ---------------------------------------------------------------------------
async function handleEventsList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')
  const source = searchParams.get('source')
  const project = searchParams.get('project')
  const since = searchParams.get('since')
  const traceId = searchParams.get('trace_id')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  try {
    let query = tables.queen_events
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200))

    if (type) query = query.like('type', `${type}%`)
    if (source) query = query.eq('source', source)
    if (project) query = query.eq('project', project)
    if (since) query = query.gte('created_at', since)
    if (traceId) query = query.eq('trace_id', traceId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching creep events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], cached: false })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: POST /api/creep/events
// ---------------------------------------------------------------------------
async function handleEventCreate(request: NextRequest) {
  try {
    const body: CreepEventCreate = await request.json()

    if (!body.type || !body.source || !body.summary) {
      return NextResponse.json(
        { error: 'type, source, and summary are required' },
        { status: 400 }
      )
    }

    const { data, error } = await tables.queen_events
      .insert({
        type: body.type,
        source: body.source,
        actor: body.actor || null,
        summary: body.summary,
        payload: body.payload || {},
        trace_id: body.trace_id || null,
        project: body.project || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating creep event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ data, cached: false }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: POST /api/creep/events/process
// ---------------------------------------------------------------------------
async function handleEventsProcess(request: NextRequest) {
  try {
    let limit = 50
    try {
      const body = await request.json()
      if (body.limit && typeof body.limit === 'number') {
        limit = Math.min(Math.max(body.limit, 1), 200)
      }
    } catch {
      // Empty body is fine — use default limit
    }

    const result = await processEvents(limit)

    return NextResponse.json({
      data: {
        processed: result.processed,
        failed: result.failed,
        skipped: result.skipped,
        total: result.processed + result.failed + result.skipped,
        details: result.details,
      },
      cached: false,
    })
  } catch (error) {
    console.error('Error processing creep events:', error)
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Route: GET /api/creep/sync
// ---------------------------------------------------------------------------
async function handleSyncList(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  try {
    const filter: {
      source?: string
      status?: SyncState['status']
      internal_type?: SyncState['internal_type']
      sync_direction?: SyncState['sync_direction']
      limit?: number
    } = {}

    const source = searchParams.get('source')
    if (source) filter.source = source

    const status = searchParams.get('status')
    if (status && ['active', 'stale', 'conflict', 'error'].includes(status)) {
      filter.status = status as SyncState['status']
    }

    const internalType = searchParams.get('internal_type')
    if (internalType && ['kanban_card', 'bender_task', 'project'].includes(internalType)) {
      filter.internal_type = internalType as SyncState['internal_type']
    }

    const direction = searchParams.get('direction')
    if (direction && ['inbound', 'outbound', 'bidirectional'].includes(direction)) {
      filter.sync_direction = direction as SyncState['sync_direction']
    }

    const limit = searchParams.get('limit')
    if (limit) {
      filter.limit = parseInt(limit, 10)
    }

    const states = await listSyncStates(filter)

    const includeBreakers = searchParams.get('include_breakers') === 'true'
    const response: Record<string, unknown> = {
      data: states,
      count: states.length,
      cached: false,
    }

    if (includeBreakers) {
      response.circuit_breakers = getAllBreakerStatuses()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error listing sync states:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: POST /api/creep/sync
// ---------------------------------------------------------------------------
async function handleSyncTrigger(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.source || typeof body.source !== 'string') {
      return NextResponse.json(
        { error: 'source is required and must be a string' },
        { status: 400 }
      )
    }

    const result = await triggerManualSync(body.source)

    return NextResponse.json({
      data: result,
      cached: false,
    })
  } catch (error) {
    console.error('Error triggering manual sync:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: GET /api/creep/sync/:id
// ---------------------------------------------------------------------------
async function handleSyncGet(id: string) {
  try {
    const state = await getSyncState(id)

    if (!state) {
      return NextResponse.json(
        { error: `Sync state "${id}" not found` },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: state, cached: false })
  } catch (error) {
    console.error('Error fetching sync state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: PUT /api/creep/sync/:id
// ---------------------------------------------------------------------------
async function handleSyncUpdate(request: NextRequest, id: string) {
  try {
    const state = await getSyncState(id)
    if (!state) {
      return NextResponse.json(
        { error: `Sync state "${id}" not found` },
        { status: 404 }
      )
    }

    const body = await request.json()
    const action = body.action

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required (resolve_conflict, force_sync, reset_breaker, update)' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'resolve_conflict': {
        if (state.status !== 'conflict') {
          return NextResponse.json(
            { error: `Sync state is "${state.status}", not "conflict" — nothing to resolve` },
            { status: 400 }
          )
        }

        const resolution = body.resolution
        if (!resolution || typeof resolution !== 'string') {
          return NextResponse.json(
            { error: 'resolution is required (describe how the conflict was resolved)' },
            { status: 400 }
          )
        }

        const direction = body.direction
        if (!direction || !['inbound', 'outbound'].includes(direction)) {
          return NextResponse.json(
            { error: 'direction is required ("inbound" = external wins, "outbound" = internal wins)' },
            { status: 400 }
          )
        }

        const resolved = await resolveConflict(id, resolution, direction)
        if (!resolved) {
          return NextResponse.json(
            { error: 'Failed to resolve conflict' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data: resolved, cached: false })
      }

      case 'force_sync': {
        const status = body.status
        if (!status || typeof status !== 'string') {
          return NextResponse.json(
            { error: 'status is required (the status to push to external system)' },
            { status: 400 }
          )
        }

        const statusMap = body.status_map
          ? { [state.source]: body.status_map }
          : undefined

        const results = await processOutboundChange(
          state.internal_type,
          state.internal_id,
          status,
          statusMap
        )

        return NextResponse.json({ data: results, cached: false })
      }

      case 'reset_breaker': {
        const wasReset = resetBreaker(state.source)
        return NextResponse.json({
          data: {
            source: state.source,
            reset: wasReset,
            message: wasReset
              ? `Circuit breaker for "${state.source}" reset to closed`
              : `No circuit breaker found for "${state.source}"`,
          },
          cached: false,
        })
      }

      case 'update': {
        const updates: Record<string, unknown> = {}

        if (body.status && ['active', 'stale', 'conflict', 'error'].includes(body.status)) {
          updates.status = body.status
        }
        if (body.sync_direction && ['inbound', 'outbound', 'bidirectional'].includes(body.sync_direction)) {
          updates.sync_direction = body.sync_direction
        }
        if (body.metadata && typeof body.metadata === 'object') {
          updates.metadata = { ...state.metadata, ...body.metadata }
        }

        if (Object.keys(updates).length === 0) {
          return NextResponse.json(
            { error: 'No valid fields to update (status, sync_direction, metadata)' },
            { status: 400 }
          )
        }

        const updated = await updateSyncState(id, updates)
        if (!updated) {
          return NextResponse.json(
            { error: 'Failed to update sync state' },
            { status: 500 }
          )
        }

        return NextResponse.json({ data: updated, cached: false })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action "${action}". Valid: resolve_conflict, force_sync, reset_breaker, update` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating sync state:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Route: GET /api/creep/webhooks
// ---------------------------------------------------------------------------
async function handleWebhooksList() {
  try {
    const { data, error } = await tables.webhook_configs
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching webhook configs:', error)
      return NextResponse.json({ error: 'Failed to fetch webhook configs' }, { status: 500 })
    }

    // Redact secrets — never expose shared secrets via API
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

// ---------------------------------------------------------------------------
// Route: POST /api/creep/webhooks
// ---------------------------------------------------------------------------
async function handleWebhookCreate(request: NextRequest) {
  try {
    const body = await request.json()

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

    const source = body.source.toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!source) {
      return NextResponse.json(
        { error: 'source must contain at least one alphanumeric character' },
        { status: 400 }
      )
    }

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
      enabled: body.enabled !== false,
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

// ---------------------------------------------------------------------------
// Route: PUT /api/creep/webhooks/:id
// ---------------------------------------------------------------------------
async function handleWebhookUpdate(request: NextRequest, id: string) {
  try {
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

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.secret !== undefined) {
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

// ---------------------------------------------------------------------------
// Catch-all dispatcher
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { path } = await params

  // GET /api/creep/agents
  if (path.length === 1 && path[0] === 'agents') {
    return handleAgentsList()
  }

  // GET /api/creep/events
  if (path.length === 1 && path[0] === 'events') {
    return handleEventsList(request)
  }

  // GET /api/creep/sync
  if (path.length === 1 && path[0] === 'sync') {
    return handleSyncList(request)
  }

  // GET /api/creep/sync/:id
  if (path.length === 2 && path[0] === 'sync') {
    return handleSyncGet(path[1])
  }

  // GET /api/creep/webhooks
  if (path.length === 1 && path[0] === 'webhooks') {
    return handleWebhooksList()
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { path } = await params

  // POST /api/creep/events
  if (path.length === 1 && path[0] === 'events') {
    return handleEventCreate(request)
  }

  // POST /api/creep/events/process
  if (path.length === 2 && path[0] === 'events' && path[1] === 'process') {
    return handleEventsProcess(request)
  }

  // POST /api/creep/sync
  if (path.length === 1 && path[0] === 'sync') {
    return handleSyncTrigger(request)
  }

  // POST /api/creep/agents/:name/heartbeat
  if (path.length === 3 && path[0] === 'agents' && path[2] === 'heartbeat') {
    return handleAgentHeartbeat(path[1])
  }

  // POST /api/creep/webhooks
  if (path.length === 1 && path[0] === 'webhooks') {
    return handleWebhookCreate(request)
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { path } = await params

  // PUT /api/creep/agents/:name
  if (path.length === 2 && path[0] === 'agents') {
    return handleAgentUpdate(request, path[1])
  }

  // PUT /api/creep/sync/:id
  if (path.length === 2 && path[0] === 'sync') {
    return handleSyncUpdate(request, path[1])
  }

  // PUT /api/creep/webhooks/:id
  if (path.length === 2 && path[0] === 'webhooks') {
    return handleWebhookUpdate(request, path[1])
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
