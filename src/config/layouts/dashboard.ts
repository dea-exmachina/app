import type { PageLayoutConfig } from '@/types/widget'
import { QuickStatsWidget } from '@/components/widgets/dashboard/QuickStatsWidget'
import { MissionBriefingWidget } from '@/components/widgets/dashboard/MissionBriefingWidget'
import { BenderStatusWidget } from '@/components/widgets/dashboard/BenderStatusWidget'
import { BoardSummaryWidget } from '@/components/widgets/dashboard/BoardSummaryWidget'
import { InboxWidget } from '@/components/widgets/inbox/InboxWidget'
import { BenderActivityWidget } from '@/components/widgets/dashboard/BenderActivityWidget'
import { DelegationRatioWidget } from '@/components/widgets/dashboard/DelegationRatioWidget'
import { ReleaseQueueWidget } from '@/components/widgets/dashboard/ReleaseQueueWidget'
import { AlertsWidget } from '@/components/widgets/dashboard/AlertsWidget'
import { SprintProgressWidget } from '@/components/widgets/dashboard/SprintProgressWidget'

export const dashboardConfig: PageLayoutConfig = {
  pageId: 'dashboard',
  widgets: [
    {
      id: 'ticker',
      title: 'Status',
      component: QuickStatsWidget,
      defaultSize: { w: 12, h: 1, minH: 1, maxH: 2 },
    },
    {
      id: 'mission-brief',
      title: 'Mission Briefing',
      component: MissionBriefingWidget,
      defaultSize: { w: 8, h: 5, minW: 4, minH: 3 },
    },
    {
      id: 'bender-status',
      title: 'Benders',
      component: BenderStatusWidget,
      defaultSize: { w: 4, h: 4, minW: 3, minH: 2 },
    },
    {
      id: 'board-summary',
      title: 'Boards',
      component: BoardSummaryWidget,
      defaultSize: { w: 8, h: 3, minH: 2 },
    },
    {
      id: 'inbox-preview',
      title: 'Inbox',
      component: InboxWidget,
      defaultSize: { w: 4, h: 3, minH: 2 },
    },
    {
      id: 'bender-activity',
      title: 'Bender Activity',
      component: BenderActivityWidget,
      defaultSize: { w: 4, h: 4, minH: 3 },
    },
    {
      id: 'delegation-ratio',
      title: 'Delegation Ratio',
      component: DelegationRatioWidget,
      defaultSize: { w: 4, h: 3, minH: 2 },
    },
    {
      id: 'release-queue',
      title: 'Release Queue',
      component: ReleaseQueueWidget,
      defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'alerts',
      title: 'Alerts',
      component: AlertsWidget,
      defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'sprint-progress',
      title: 'Sprint Progress',
      component: SprintProgressWidget,
      defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    },
  ],
  defaultLayouts: {
    lg: [
      { i: 'ticker', x: 0, y: 0, w: 12, h: 1, minH: 1, maxH: 2 },
      { i: 'mission-brief', x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'bender-status', x: 8, y: 1, w: 4, h: 4, minW: 3, minH: 2 },
      { i: 'board-summary', x: 0, y: 6, w: 8, h: 3, minH: 2 },
      { i: 'inbox-preview', x: 8, y: 5, w: 4, h: 3, minH: 2 },
      { i: 'bender-activity', x: 0, y: 9, w: 4, h: 4, minH: 3 },
      { i: 'release-queue', x: 4, y: 9, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'delegation-ratio', x: 8, y: 8, w: 4, h: 3, minH: 2 },
      { i: 'alerts', x: 0, y: 13, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'sprint-progress', x: 4, y: 13, w: 4, h: 3, minW: 3, minH: 2 },
    ],
    md: [
      { i: 'ticker', x: 0, y: 0, w: 8, h: 1, minH: 1, maxH: 2 },
      { i: 'mission-brief', x: 0, y: 1, w: 8, h: 5, minW: 4, minH: 3 },
      { i: 'bender-status', x: 0, y: 6, w: 8, h: 3, minW: 3, minH: 2 },
      { i: 'board-summary', x: 0, y: 9, w: 8, h: 3, minH: 2 },
      { i: 'inbox-preview', x: 0, y: 12, w: 8, h: 3, minH: 2 },
      { i: 'bender-activity', x: 0, y: 15, w: 8, h: 4, minH: 3 },
      { i: 'release-queue', x: 0, y: 19, w: 8, h: 4, minW: 3, minH: 3 },
      { i: 'delegation-ratio', x: 0, y: 23, w: 8, h: 3, minH: 2 },
      { i: 'alerts', x: 0, y: 26, w: 8, h: 4, minW: 3, minH: 3 },
      { i: 'sprint-progress', x: 0, y: 30, w: 8, h: 3, minW: 3, minH: 2 },
    ],
    sm: [
      { i: 'ticker', x: 0, y: 0, w: 4, h: 2, minH: 1 },
      { i: 'mission-brief', x: 0, y: 2, w: 4, h: 6, minW: 4, minH: 3 },
      { i: 'bender-status', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 2 },
      { i: 'board-summary', x: 0, y: 12, w: 4, h: 4, minH: 2 },
      { i: 'inbox-preview', x: 0, y: 16, w: 4, h: 4, minH: 2 },
      { i: 'bender-activity', x: 0, y: 20, w: 4, h: 4, minH: 3 },
      { i: 'release-queue', x: 0, y: 24, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'delegation-ratio', x: 0, y: 28, w: 4, h: 4, minH: 2 },
      { i: 'alerts', x: 0, y: 32, w: 4, h: 4, minW: 3, minH: 3 },
      { i: 'sprint-progress', x: 0, y: 36, w: 4, h: 3, minW: 3, minH: 2 },
    ],
  },
}
