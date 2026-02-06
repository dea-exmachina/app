import type { PageLayoutConfig } from '@/types/widget'
import { BoardSelectorWidget } from '@/components/widgets/kanban/BoardSelectorWidget'

export const kanbanConfig: PageLayoutConfig = {
  pageId: 'kanban',
  widgets: [
    {
      id: 'board-selector',
      title: 'Kanban Boards',
      component: BoardSelectorWidget,
      defaultSize: { w: 12, h: 8, minH: 4 },
    },
  ],
  defaultLayouts: {
    lg: [{ i: 'board-selector', x: 0, y: 0, w: 12, h: 8, minH: 4 }],
    md: [{ i: 'board-selector', x: 0, y: 0, w: 8, h: 8, minH: 4 }],
    sm: [{ i: 'board-selector', x: 0, y: 0, w: 4, h: 10, minH: 4 }],
  },
}
