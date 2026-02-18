import type { PageLayoutConfig } from '@/types/widget'
import { PlatformOverviewWidget } from '@/components/widgets/benders/PlatformOverviewWidget'
import { TaskBrowserWidget } from '@/components/widgets/benders/TaskBrowserWidget'
import { TeamViewWidget } from '@/components/widgets/benders/TeamViewWidget'
import { ActivityFeedWidget } from '@/components/widgets/benders/ActivityFeedWidget'

export const bendersConfig: PageLayoutConfig = {
  pageId: 'benders',
  widgets: [
    {
      id: 'platform-overview',
      title: 'Platform Overview',
      component: PlatformOverviewWidget,
      defaultSize: { w: 12, h: 4, minH: 3 },
    },
    {
      id: 'task-browser',
      title: 'Task Browser',
      component: TaskBrowserWidget,
      defaultSize: { w: 8, h: 5, minW: 4, minH: 3 },
    },
    {
      id: 'team-view',
      title: 'Team View',
      component: TeamViewWidget,
      defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
    },
    {
      id: 'activity-feed',
      title: 'Activity Feed',
      component: ActivityFeedWidget,
      defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
    },
  ],
  defaultLayouts: {
    lg: [
      { i: 'platform-overview', x: 0, y: 0, w: 12, h: 4, minH: 3 },
      { i: 'task-browser', x: 0, y: 4, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'team-view', x: 8, y: 4, w: 4, h: 5, minW: 3, minH: 3 },
      { i: 'activity-feed', x: 8, y: 9, w: 4, h: 5, minW: 3, minH: 3 },
    ],
    md: [
      { i: 'platform-overview', x: 0, y: 0, w: 8, h: 4, minH: 3 },
      { i: 'task-browser', x: 0, y: 4, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'team-view', x: 0, y: 9, w: 8, h: 5, minW: 3, minH: 3 },
      { i: 'activity-feed', x: 0, y: 14, w: 8, h: 5, minW: 3, minH: 3 },
    ],
    sm: [
      { i: 'platform-overview', x: 0, y: 0, w: 4, h: 5, minH: 3 },
      { i: 'task-browser', x: 0, y: 5, w: 4, h: 6, minW: 4, minH: 3 },
      { i: 'team-view', x: 0, y: 11, w: 4, h: 6, minW: 3, minH: 3 },
      { i: 'activity-feed', x: 0, y: 17, w: 4, h: 6, minW: 3, minH: 3 },
    ],
  },
}
