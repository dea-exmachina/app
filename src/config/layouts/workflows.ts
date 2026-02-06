import type { PageLayoutConfig } from '@/types/widget'
import { WorkflowListWidget } from '@/components/widgets/workflows/WorkflowListWidget'

export const workflowsConfig: PageLayoutConfig = {
  pageId: 'workflows',
  widgets: [
    {
      id: 'workflow-list',
      title: 'Workflows',
      component: WorkflowListWidget,
      defaultSize: { w: 12, h: 8, minH: 4 },
    },
  ],
  defaultLayouts: {
    lg: [{ i: 'workflow-list', x: 0, y: 0, w: 12, h: 8, minH: 4 }],
    md: [{ i: 'workflow-list', x: 0, y: 0, w: 8, h: 8, minH: 4 }],
    sm: [{ i: 'workflow-list', x: 0, y: 0, w: 4, h: 10, minH: 4 }],
  },
}
