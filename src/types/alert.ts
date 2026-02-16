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
  card_id: string | null
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
}
