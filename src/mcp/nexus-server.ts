#!/usr/bin/env npx tsx
/**
 * NEXUS MCP Server — Model Context Protocol interface for NEXUS
 *
 * Exposes NEXUS card lifecycle, context engine, locking, and event
 * operations as MCP tools for Claude Code and other MCP-compatible agents.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx src/mcp/nexus-server.ts
 *
 * Claude Code config (~/.claude/settings.json):
 *   "mcpServers": {
 *     "nexus": {
 *       "command": "npx",
 *       "args": ["tsx", "D:/dev/control-center/src/mcp/nexus-server.ts"],
 *       "env": { "SUPABASE_URL": "...", "SUPABASE_SERVICE_KEY": "..." }
 *     }
 *   }
 *
 * DEA-042 | Phase 4a — Agent SDK & MCP
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ──────────────────────────────────────────

async function resolveCardUuid(cardId: string): Promise<string | null> {
  const { data } = await supabase
    .from('nexus_cards')
    .select('id')
    .eq('card_id', cardId)
    .single()
  return data?.id ?? null
}

// ── Server Setup ─────────────────────────────────────

const server = new McpServer({
  name: 'nexus',
  version: '1.0.0',
})

// ── Tools ────────────────────────────────────────────

server.tool(
  'nexus_list_cards',
  'List NEXUS cards with optional filters (project, lane, assignee, bender_lane)',
  {
    project_slug: z.string().optional().describe('Filter by project slug (e.g. "council", "control-center")'),
    lane: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done']).optional().describe('Filter by lane'),
    bender_lane: z.enum(['proposed', 'queued', 'executing', 'delivered', 'integrated']).optional().describe('Filter by bender lane'),
    assigned_to: z.string().optional().describe('Filter by assignee'),
    card_type: z.enum(['epic', 'task', 'bug', 'chore', 'research']).optional().describe('Filter by card type'),
    limit: z.number().optional().default(50).describe('Max results (default 50)'),
  },
  async (params) => {
    let query = supabase
      .from('nexus_cards')
      .select('card_id, title, lane, bender_lane, card_type, assigned_to, priority, project_id, parent_id, tags, subtasks, due_date, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 50)

    if (params.project_slug) {
      const { data: project } = await supabase
        .from('nexus_projects')
        .select('id')
        .eq('slug', params.project_slug)
        .single()
      if (project) query = query.eq('project_id', project.id)
    }
    if (params.lane) query = query.eq('lane', params.lane)
    if (params.bender_lane) query = query.eq('bender_lane', params.bender_lane)
    if (params.assigned_to) query = query.eq('assigned_to', params.assigned_to)
    if (params.card_type) query = query.eq('card_type', params.card_type)

    const { data, error } = await query
    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    }
  }
)

server.tool(
  'nexus_get_context',
  'Get progressive disclosure context for a card. Layer 0: card only. Layer 1: card + details + comments. Layer 2: full context + children.',
  {
    card_id: z.string().describe('Card ID (e.g. "DEA-042")'),
    layer: z.number().min(0).max(2).default(1).describe('Disclosure layer (0, 1, or 2)'),
  },
  async (params) => {
    const { data: card, error: cardError } = await supabase
      .from('nexus_cards')
      .select('*')
      .eq('card_id', params.card_id)
      .single()

    if (cardError || !card) {
      return { content: [{ type: 'text' as const, text: `Card not found: ${params.card_id}` }], isError: true }
    }

    if (params.layer === 0) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ card }, null, 2) }] }
    }

    const [detailsRes, commentsRes] = await Promise.all([
      supabase.from('nexus_task_details').select('*').eq('card_id', card.id).maybeSingle(),
      supabase.from('nexus_comments').select('*').eq('card_id', card.id).order('created_at', { ascending: true }),
    ])

    const result: Record<string, unknown> = {
      card,
      details: detailsRes.data ?? null,
      comments: commentsRes.data ?? [],
    }

    if (params.layer === 2) {
      const [contextRes, childrenRes] = await Promise.all([
        supabase.from('nexus_context_packages').select('*').eq('card_id', card.id).eq('stale', false).order('assembled_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('nexus_cards').select('*').eq('parent_id', card.id).order('created_at', { ascending: true }),
      ])
      result.context = contextRes.data ?? null
      result.children = childrenRes.data ?? []
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'nexus_move_card',
  'Move a card to a new lane (backlog, ready, in_progress, review, done)',
  {
    card_id: z.string().describe('Card ID (e.g. "DEA-042")'),
    lane: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done']).describe('Target lane'),
  },
  async (params) => {
    const { data, error } = await supabase
      .from('nexus_cards')
      .update({ lane: params.lane })
      .eq('card_id', params.card_id)
      .select('card_id, title, lane')
      .single()

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: `Moved ${data.card_id} to ${data.lane}` }] }
  }
)

server.tool(
  'nexus_move_bender_lane',
  'Move a card to a bender lane (proposed, queued, executing, delivered, integrated)',
  {
    card_id: z.string().describe('Card ID (e.g. "DEA-042")'),
    bender_lane: z.enum(['proposed', 'queued', 'executing', 'delivered', 'integrated']).describe('Target bender lane'),
  },
  async (params) => {
    const { data, error } = await supabase
      .from('nexus_cards')
      .update({ bender_lane: params.bender_lane })
      .eq('card_id', params.card_id)
      .select('card_id, title, bender_lane')
      .single()

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: `Bender lane: ${data.card_id} → ${data.bender_lane}` }] }
  }
)

server.tool(
  'nexus_add_comment',
  'Add a comment to a card',
  {
    card_id: z.string().describe('Card ID (e.g. "DEA-042")'),
    author: z.string().describe('Comment author (e.g. "dea", "bender+atlas")'),
    content: z.string().describe('Comment text'),
    comment_type: z.enum(['note', 'pivot', 'question', 'directive']).optional().default('note'),
    is_pivot: z.boolean().optional().default(false),
    pivot_impact: z.enum(['minor', 'major']).optional(),
  },
  async (params) => {
    const uuid = await resolveCardUuid(params.card_id)
    if (!uuid) return { content: [{ type: 'text' as const, text: `Card not found: ${params.card_id}` }], isError: true }

    const { data, error } = await supabase
      .from('nexus_comments')
      .insert({
        card_id: uuid,
        author: params.author,
        content: params.content,
        comment_type: params.comment_type,
        is_pivot: params.is_pivot,
        pivot_impact: params.pivot_impact,
      })
      .select('id, created_at')
      .single()

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: `Comment added to ${params.card_id} (${data.id})` }] }
  }
)

server.tool(
  'nexus_acquire_lock',
  'Acquire a lock (task, file, or scope) for exclusive access',
  {
    lock_type: z.enum(['task', 'file', 'scope']).describe('Lock type'),
    card_id: z.string().optional().describe('Card ID to associate the lock with'),
    agent: z.string().describe('Agent acquiring the lock'),
    target: z.string().describe('Lock target (card_id for task, file path for file, scope path for scope)'),
    timeout_hours: z.number().optional().default(4).describe('Lock timeout in hours'),
  },
  async (params) => {
    let resolvedCardId: string | null = null
    if (params.card_id) {
      resolvedCardId = await resolveCardUuid(params.card_id)
    }

    // Check for conflicts
    const { data: existing } = await supabase
      .from('nexus_locks')
      .select('*')
      .eq('target', params.target)
      .is('released_at', null)

    if (existing && existing.length > 0) {
      const conflict = existing[0]
      return {
        content: [{ type: 'text' as const, text: `Lock conflict: ${params.target} held by ${conflict.agent} (expires ${conflict.expires_at})` }],
        isError: true,
      }
    }

    const expiresAt = new Date(Date.now() + (params.timeout_hours ?? 4) * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('nexus_locks')
      .insert({
        lock_type: params.lock_type,
        card_id: resolvedCardId,
        agent: params.agent,
        target: params.target,
        expires_at: expiresAt,
      })
      .select('id, target, expires_at')
      .single()

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: `Lock acquired: ${data.target} (expires ${data.expires_at})` }] }
  }
)

server.tool(
  'nexus_release_lock',
  'Release a lock by target',
  {
    target: z.string().describe('Lock target to release'),
    agent: z.string().describe('Agent releasing the lock'),
  },
  async (params) => {
    const { data, error } = await supabase
      .from('nexus_locks')
      .update({ released_at: new Date().toISOString() })
      .eq('target', params.target)
      .eq('agent', params.agent)
      .is('released_at', null)
      .select('id, target')

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    if (!data || data.length === 0) return { content: [{ type: 'text' as const, text: `No active lock found for ${params.target}` }] }
    return { content: [{ type: 'text' as const, text: `Lock released: ${params.target}` }] }
  }
)

server.tool(
  'nexus_get_events',
  'Get recent NEXUS events, optionally filtered by card or type',
  {
    card_id: z.string().optional().describe('Filter by card ID'),
    event_type: z.string().optional().describe('Filter by event type (e.g. "card.moved")'),
    limit: z.number().optional().default(20).describe('Max results'),
  },
  async (params) => {
    let query = supabase
      .from('nexus_events')
      .select('event_type, card_id, actor, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 20)

    if (params.card_id) {
      const uuid = await resolveCardUuid(params.card_id)
      if (uuid) query = query.eq('card_id', uuid)
    }
    if (params.event_type) query = query.eq('event_type', params.event_type)

    const { data, error } = await query
    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
  }
)

server.tool(
  'nexus_create_card',
  'Create a new NEXUS card (ID auto-generated from project prefix)',
  {
    project_slug: z.string().describe('Project slug (e.g. "council", "control-center")'),
    title: z.string().describe('Card title'),
    lane: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done']).default('backlog'),
    card_type: z.enum(['epic', 'task', 'bug', 'chore', 'research']).default('task'),
    summary: z.string().optional().describe('1-2 sentence summary'),
    delegation_tag: z.enum(['BENDER', 'DEA']).optional().default('BENDER'),
    assigned_to: z.string().optional(),
    priority: z.enum(['critical', 'high', 'normal', 'low']).optional().default('normal'),
    parent_card_id: z.string().optional().describe('Parent card ID for hierarchy'),
    tags: z.array(z.string()).optional(),
  },
  async (params) => {
    const { data: project, error: projErr } = await supabase
      .from('nexus_projects')
      .select('id')
      .eq('slug', params.project_slug)
      .single()

    if (projErr || !project) {
      return { content: [{ type: 'text' as const, text: `Project not found: ${params.project_slug}` }], isError: true }
    }

    let parentUuid: string | null = null
    if (params.parent_card_id) {
      parentUuid = await resolveCardUuid(params.parent_card_id)
    }

    const { data, error } = await supabase
      .from('nexus_cards')
      .insert({
        project_id: project.id,
        parent_id: parentUuid,
        title: params.title,
        lane: params.lane,
        card_type: params.card_type,
        summary: params.summary,
        delegation_tag: params.delegation_tag,
        assigned_to: params.assigned_to,
        priority: params.priority,
        tags: params.tags,
      })
      .select('card_id, title, lane')
      .single()

    if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    return { content: [{ type: 'text' as const, text: `Created: ${data.card_id} — ${data.title} [${data.lane}]` }] }
  }
)

// ── Start Server ─────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
