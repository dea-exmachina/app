import type { PageLayoutConfig } from '@/types/widget'
import { ProjectGridWidget } from '@/components/widgets/projects/ProjectGridWidget'

export const projectsConfig: PageLayoutConfig = {
  pageId: 'projects',
  widgets: [
    {
      id: 'project-grid',
      title: 'Projects',
      component: ProjectGridWidget,
      defaultSize: { w: 12, h: 8, minH: 4 },
    },
  ],
  defaultLayouts: {
    lg: [{ i: 'project-grid', x: 0, y: 0, w: 12, h: 8, minH: 4 }],
    md: [{ i: 'project-grid', x: 0, y: 0, w: 8, h: 8, minH: 4 }],
    sm: [{ i: 'project-grid', x: 0, y: 0, w: 4, h: 10, minH: 4 }],
  },
}
