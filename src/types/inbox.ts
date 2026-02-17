export type InboxItemType = 'note' | 'link' | 'file' | 'instruction'
export type InboxItemStatus = 'pending' | 'processing' | 'done'
export type InboxPriority = 'critical' | 'high' | 'normal' | 'low'

export interface InboxItem {
  filename: string
  title: string
  type: InboxItemType
  status: InboxItemStatus
  created: string
  source: string
  content: string
  sha: string | null // needed for delete
  // New fields (NEXUS-055)
  project_id?: string | null
  priority?: InboxPriority
  archived_at?: string | null
  processed_at?: string | null
  metadata?: Record<string, unknown>
}

export interface InboxCreateRequest {
  title: string
  content: string
  type: InboxItemType
  project_id?: string | null
  priority?: InboxPriority
  metadata?: Record<string, unknown>
}

export interface InboxUploadRequest {
  title: string
  type: InboxItemType
  file_name: string      // original filename
  file_type: string      // MIME type
  file_size: number      // bytes
  file_content: string   // base64-encoded content
}
