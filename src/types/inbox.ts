export type InboxItemType = 'note' | 'link' | 'file' | 'instruction'
export type InboxItemStatus = 'pending' | 'processing' | 'done'
export type InboxItemPriority = 'critical' | 'high' | 'normal' | 'low'

export interface InboxItem {
  // Core fields
  id: string
  filename: string
  title: string
  type: InboxItemType
  status: InboxItemStatus
  created: string
  source: string
  content: string

  // Supabase-backed fields
  created_at: string
  updated_at: string
  project_id: string | null
  priority: InboxItemPriority | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  linked_card_id: string | null
  assigned_to: string | null
  tags: string[]

  // Legacy GitHub field (backward compat)
  sha: string | null
}

export interface InboxCreateRequest {
  title: string
  content: string
  type: InboxItemType
  project_id?: string
  priority?: InboxItemPriority
  file_path?: string
  file_size?: number
  mime_type?: string
  tags?: string[]
}

export interface InboxUploadRequest {
  title: string
  type: InboxItemType
  file_name: string
  file_type: string
  file_size: number
  file_content: string
}

export interface InboxUpdateRequest {
  title?: string
  content?: string
  type?: InboxItemType
  status?: InboxItemStatus
  priority?: InboxItemPriority
  project_id?: string
  linked_card_id?: string
  assigned_to?: string
  tags?: string[]
  file_path?: string
  file_size?: number
  mime_type?: string
}

export interface InboxFilter {
  project_id?: string
  status?: InboxItemStatus
  type?: InboxItemType
  priority?: InboxItemPriority
}
