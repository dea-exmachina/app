import type { PageLayoutConfig } from '@/types/widget'
import { SkillGridWidget } from '@/components/widgets/skills/SkillGridWidget'

export const skillsConfig: PageLayoutConfig = {
  pageId: 'skills',
  widgets: [
    {
      id: 'skill-grid',
      title: 'Skills',
      component: SkillGridWidget,
      defaultSize: { w: 12, h: 8, minH: 4 },
    },
  ],
  defaultLayouts: {
    lg: [{ i: 'skill-grid', x: 0, y: 0, w: 12, h: 8, minH: 4 }],
    md: [{ i: 'skill-grid', x: 0, y: 0, w: 8, h: 8, minH: 4 }],
    sm: [{ i: 'skill-grid', x: 0, y: 0, w: 4, h: 10, minH: 4 }],
  },
}
