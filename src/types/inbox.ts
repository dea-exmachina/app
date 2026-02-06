export type InboxItemType = 'note' | 'link' | 'file' | 'instruction'

export interface InboxItem {
  filename: string
  title: string
  type: InboxItemType
  created: string
  source: string
  content: string
  sha: string | null // needed for delete
}

export interface InboxCreateRequest {
  title: string
  content: string
  type: InboxItemType
}
