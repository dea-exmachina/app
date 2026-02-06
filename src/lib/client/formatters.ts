// Date formatting, tag color mapping, status color mapping, etc.
// Import color maps from src/config/categories.ts

import { TAG_COLORS, STATUS_COLORS, CATEGORY_MAP } from '@/config/categories'

export function formatDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelativeDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return formatDate(date)
}

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || '#E0E0E0'
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#9B8E7B'
}

export function getCategoryColor(category: string): string {
  // Try to find by slug first
  for (const [_name, config] of Object.entries(CATEGORY_MAP)) {
    if (config.slug === category) {
      return config.color
    }
  }
  // Fallback
  return '#8B7355'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
