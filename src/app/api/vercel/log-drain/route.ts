/**
 * Vercel Log Drain Receiver
 *
 * Receives POST from Vercel Log Drain, filters for errors/5xx, and writes
 * to nexus_alerts + Discord.
 *
 * Setup (Vercel dashboard after deploy):
 *   URL:    https://your-domain.com/api/vercel/log-drain
 *   Secret: set VERCEL_LOG_DRAIN_SECRET env var; Vercel sends it as x-vercel-signature
 *
 * NEXUS-089
 */

import { NextRequest, NextResponse } from 'next/server'
import { tables } from '@/lib/server/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VercelLogEntry {
  id?: string
  message?: string
  timestamp?: number
  level?: string
  statusCode?: number
  source?: string
  deploymentId?: string
  requestId?: string
  [key: string]: unknown
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Validates the x-vercel-signature header against the configured secret.
 * Vercel sends the raw secret value (not HMAC) in this header.
 * Returns false if VERCEL_LOG_DRAIN_SECRET is not set or header doesn't match.
 */
function isValidSignature(request: NextRequest): boolean {
  const secret = process.env.VERCEL_LOG_DRAIN_SECRET
  if (!secret) return false

  const header = request.headers.get('x-vercel-signature')
  if (!header) return false

  // Constant-time comparison to avoid timing attacks
  if (header.length !== secret.length) return false
  let diff = 0
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ secret.charCodeAt(i)
  }
  return diff === 0
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/**
 * Returns true for log entries that should create an alert:
 * - level === 'error'
 * - statusCode >= 500
 */
function isErrorEntry(entry: VercelLogEntry): boolean {
  if (entry.level === 'error') return true
  if (typeof entry.statusCode === 'number' && entry.statusCode >= 500) return true
  return false
}

// ── Discord Notification ──────────────────────────────────────────────────────

async function notifyDiscord(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_ALERTS
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **Vercel Error** — ${message} (source: log-drain)`,
      }),
    })
  } catch (err) {
    // Non-fatal — alert was already written to DB
    console.error('Discord notify failed:', err)
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  if (!isValidSignature(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let entries: VercelLogEntry[]
  try {
    const body = await request.json()
    entries = Array.isArray(body) ? body : [body]
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const errorEntries = entries.filter(isErrorEntry)
  let alertsCreated = 0

  for (const entry of errorEntries) {
    const message = String(entry.message ?? '(no message)').slice(0, 1000)
    const title = entry.statusCode
      ? `Vercel ${entry.statusCode} error`
      : 'Vercel runtime error'

    const { error } = await tables.nexus_alerts
      .insert({
        source: 'vercel',
        severity: 'critical',
        title,
        message,
        status: 'new',
      })

    if (error) {
      console.error('nexus_alerts insert error:', error)
      continue
    }

    alertsCreated++
    await notifyDiscord(message)
  }

  return NextResponse.json({
    received: entries.length,
    alerts: alertsCreated,
  })
}
