export type InboxItemType = 'note' | 'link' | 'file' | 'instruction'
export type InboxItemStatus = 'pending' | 'processing' | 'done'
export type InboxPriority = 'critical' | 'high' | 'normal' | 'low'

export interface InboxItem {
  id: string
  filename: string
  title: string
  type: InboxItemType
  status: InboxItemStatus
  created: string
  source: string
  content: string
  sha: string | null // needed for delete
  projectId: string | null
  priority: InboxPriority
  fileSize: number | null
  mimeType: string | null
  linkedCardId: string | null
  tags: string[]
}

export interface InboxCreateRequest {
  title: string
  content: string
  type: InboxItemType
  projectId?: string
  priority?: InboxPriority
  tags?: string[]
}
