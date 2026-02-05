// Board ID to file path mapping
// Static for v1, dynamic discovery from INDEX.md in v2

export const BOARD_MAP: Record<string, { path: string; name: string }> = {
  management: { path: 'kanban/management.md', name: 'Management' },
  bender: { path: 'kanban/bender.md', name: 'Bender Tasks' },
  'job-search': { path: 'kanban/job-search.md', name: 'Job Search' },
  kerkoporta: {
    path: 'portfolio/kerkoporta/kanban.md',
    name: 'Kerkoporta',
  },
  'control-center': {
    path: 'portfolio/control-center/kanban.md',
    name: 'Control Center',
  },
}

export const DEFAULT_BOARD = 'management'
