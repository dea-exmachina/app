import type { PageLayoutConfig } from '@/types/widget'
import { QuickStatsWidget } from '@/components/widgets/dashboard/QuickStatsWidget'
import { MissionBriefingWidget } from '@/components/widgets/dashboard/MissionBriefingWidget'
import { BenderStatusWidget } from '@/components/widgets/dashboard/BenderStatusWidget'
import { BoardSummaryWidget } from '@/components/widgets/dashboard/BoardSummaryWidget'

export const dashboardConfig: PageLayoutConfig = {
  pageId: 'dashboard',
  widgets: [
    {
      id: 'quick-stats',
      title: 'Quick Stats',
      component: QuickStatsWidget,
      defaultSize: { w: 12, h: 2, minH: 2 },
    },
    {
      id: 'mission-brief',
      title: 'Mission Briefing',
      component: MissionBriefingWidget,
      defaultSize: { w: 8, h: 5, minW: 4, minH: 3 },
    },
    {
      id: 'bender-status',
      title: 'Bender Status',
      component: BenderStatusWidget,
      defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
    },
    {
      id: 'board-summary',
      title: 'Kanban Boards',
      component: BoardSummaryWidget,
      defaultSize: { w: 12, h: 4, minH: 3 },
    },
  ],
  defaultLayouts: {
    lg: [
      { i: 'quick-stats', x: 0, y: 0, w: 12, h: 2, minH: 2 },
      { i: 'mission-brief', x: 0, y: 2, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'bender-status', x: 8, y: 2, w: 4, h: 5, minW: 3, minH: 3 },
      { i: 'board-summary', x: 0, y: 7, w: 12, h: 4, minH: 3 },
    ],
    md: [
      { i: 'quick-stats', x: 0, y: 0, w: 8, h: 2, minH: 2 },
      { i: 'mission-brief', x: 0, y: 2, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'bender-status', x: 0, y: 7, w: 8, h: 4, minW: 3, minH: 3 },
      { i: 'board-summary', x: 0, y: 11, w: 8, h: 4, minH: 3 },
    ],
    sm: [
      { i: 'quick-stats', x: 0, y: 0, w: 4, h: 3, minH: 2 },
      { i: 'mission-brief', x: 0, y: 3, w: 4, h: 6, minW: 4, minH: 3 },
      { i: 'bender-status', x: 0, y: 9, w: 4, h: 5, minW: 3, minH: 3 },
      { i: 'board-summary', x: 0, y: 14, w: 4, h: 5, minH: 3 },
    ],
  },
}
