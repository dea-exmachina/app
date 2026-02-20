/**
 * Research Intelligence System types
 *
 * Matches research_subscriptions and research_reports tables.
 */

// --- Subscriptions ---

export type ResearchFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type SubscriptionStatus = 'active' | 'paused' | 'archived'

export interface ResearchRecipient {
  name: string
  email: string
}

export interface ResearchBranding {
  logo_url?: string
  primary_color?: string
  accent_color?: string
  header_text?: string
  footer_text?: string
}

export interface ResearchSubscription {
  id: string
  name: string
  slug: string
  description: string | null
  keywords: string[]
  excluded_keywords: string[]
  data_sources: string[]
  search_depth: number
  frequency: ResearchFrequency
  schedule_day: number
  schedule_hour: number
  reference_date?: string | null
  next_run_at: string | null
  last_run_at: string | null
  recipients: ResearchRecipient[]
  branding: ResearchBranding
  status: SubscriptionStatus
  created_at: string
  updated_at: string
}

export interface ResearchSubscriptionCreate {
  name: string
  slug?: string
  description?: string
  keywords: string[]
  excluded_keywords?: string[]
  data_sources?: string[]
  search_depth?: number
  frequency?: ResearchFrequency
  schedule_day?: number
  schedule_hour?: number
  reference_date?: string | null
  recipients?: ResearchRecipient[]
  branding?: ResearchBranding
  status?: SubscriptionStatus
}

export interface ResearchSubscriptionUpdate {
  name?: string
  description?: string
  keywords?: string[]
  excluded_keywords?: string[]
  data_sources?: string[]
  search_depth?: number
  frequency?: ResearchFrequency
  schedule_day?: number
  schedule_hour?: number
  reference_date?: string | null
  next_run_at?: string | null
  recipients?: ResearchRecipient[]
  branding?: ResearchBranding
  status?: SubscriptionStatus
}

// --- Reports ---

export type ReportStatus = 'generating' | 'ready' | 'failed' | 'archived'
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export type FindingSignificance = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface RichFinding {
  finding: string
  significance: FindingSignificance
  sources?: string[]
  is_new?: boolean
  implication?: string  // Required for CRITICAL/HIGH
}

export type KeyFinding = string | RichFinding

export interface ReportSource {
  title: string
  url: string
}

export interface ReportChart {
  type: 'line' | 'bar' | 'area' | 'radar'
  title: string
  data: Record<string, unknown>[]
  description?: string
}

export interface ReportSection {
  title: string
  content: string
  charts?: ReportChart[]
  sources?: ReportSource[]
}

export interface ReportSentiment {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed'
  score: number
  breakdown: {
    positive: number
    neutral: number
    negative: number
  }
}

export interface ResearchReport {
  id: string
  subscription_id: string
  slug: string
  title: string
  executive_summary: string | null
  sections: ReportSection[]
  key_findings: string[]
  sentiment_data: ReportSentiment | Record<string, never>
  chart_data: Record<string, unknown>
  raw_data: Record<string, unknown>
  report_date: string
  period_start: string | null
  period_end: string | null
  data_sources_used: string[]
  source_count: number
  generation_time_ms: number | null
  status: ReportStatus
  error_message: string | null
  email_sent_at: string | null
  email_status: EmailStatus
  created_at: string
  updated_at: string
  previous_report_id?: string | null
  delta_summary?: string | null
  new_findings_count?: number | null
}

// --- API Request/Response ---

export interface ResearchSubscriptionWithLatestReport extends ResearchSubscription {
  latest_report?: ResearchReport | null
}
