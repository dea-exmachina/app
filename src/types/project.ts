/**
 * Project Types for Control Center v2
 *
 * Type definitions for project creation, management, and provisioning.
 */

import type { Database } from './supabase'

// Database types from Supabase
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type ProjectTemplate = Database['public']['Tables']['project_templates']['Row']

/**
 * Project creation request
 */
export interface CreateProjectRequest {
  name: string
  slug?: string // Auto-generated from name if not provided
  type: ProjectType
  template_id?: string
  repo_path?: string
  git_repo_url?: string
  settings?: Record<string, any>
  dashboard_layout?: DashboardLayout
  integrations?: Record<string, any>
}

/**
 * Project type enum
 */
export type ProjectType = 'software' | 'content' | 'life' | 'business' | 'hobby' | 'custom'

/**
 * Dashboard widget configuration
 */
export interface DashboardLayout {
  widgets: Widget[]
  columns: number // 1, 2, 3, or 4 column layout
  theme: 'light' | 'dark' | 'auto'
}

export interface Widget {
  type: WidgetType
  position: WidgetPosition
  config: Record<string, any> // Widget-specific settings
  visible: boolean
}

export interface WidgetPosition {
  row: number
  col: number
  width: number // Grid units
  height: number // Grid units
}

export type WidgetType =
  | 'kanban'
  | 'calendar'
  | 'bender-status'
  | 'chat'
  | 'stats'
  | 'content-pipeline'
  | 'code-deploys'
  | 'habit-tracker'
  | 'social-calendar'

/**
 * Project list response
 */
export interface ProjectListResponse {
  projects: Project[]
  total: number
}

/**
 * Project detail response
 */
export interface ProjectDetailResponse extends Project {
  template?: ProjectTemplate | null
  bender_count?: number
  card_count?: number
}

/**
 * Project status
 */
export type ProjectStatus = 'active' | 'paused' | 'archived'

/**
 * Error response
 */
export interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

// ===== Legacy v1 Types (for backward compatibility) =====
// These types are used by the existing v1 markdown-based project system
// TODO: Migrate v1 code to use v2 Supabase types

export interface ProjectLegacy {
  id: string // folder name
  name: string // from brief title (# heading)
  domain: string // from frontmatter
  status: string // active, paused, complete
  created: string
  overview: string // first paragraph after ## Overview
  files: string[] // files in project dir
}

export interface ProjectDetail extends ProjectLegacy {
  content: string // full brief markdown content (after frontmatter)
}
