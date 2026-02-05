// Skill category definitions mapped from dea-skilllist.md headings
// Colors follow the Kerkoporta palette: dark base, cream/warm accents

import type { SkillCategory } from '@/types/skill'

export const CATEGORY_MAP: Record<
  string,
  { slug: SkillCategory; color: string }
> = {
  'Meta-Skills': { slug: 'meta', color: '#8B7355' },
  Identity: { slug: 'identity', color: '#6B8E6B' },
  'Bender Management': { slug: 'bender-management', color: '#7B8EAD' },
  'Session Management': { slug: 'session', color: '#9B8E7B' },
  'Content & Creative': { slug: 'content', color: '#AD7B7B' },
  'Development & Workflows': { slug: 'development', color: '#7BAD8E' },
  Professional: { slug: 'professional', color: '#8E7BAD' },
}

export const TAG_COLORS: Record<string, string> = {
  '#epic': '#DDCBAD',
  '#task': '#E0E0E0',
  '#dea': '#7B8EAD',
  '#kerkoporta': '#AD7B7B',
  '#article': '#9B8E7B',
  '#enhancement': '#7BAD8E',
  '#design': '#8E7BAD',
  '#pattern': '#8B7355',
  '#template': '#6B8E6B',
}

export const STATUS_COLORS = {
  proposed: '#9B8E7B',
  executing: '#7BAD8E',
  delivered: '#7B8EAD',
  integrated: '#DDCBAD',
  active: '#7BAD8E',
  planned: '#9B8E7B',
  archived: '#666666',
  deprecated: '#666666',
}
