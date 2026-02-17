export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'new' | 'acknowledged' | 'resolved'
export type AlertSource = 'vercel' | 'supabase' | 'github' | 'resend' | 'cloudflare' | 'hookify' | 'manual'

export interface Alert {
  id: string
  source: AlertSource
  severity: AlertSeverity
  title: string
  message: string | null
  status: AlertStatus
  cardId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
}

export interface AlertCreateRequest {
  source: AlertSource
  severity?: AlertSeverity
  title: string
  message?: string
  cardId?: string
  metadata?: Record<string, unknown>
}
