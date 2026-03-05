import type { PageLayoutConfig } from '@/types/widget'
import { PipelineStatusWidget } from '@/components/widgets/pipeline/PipelineStatusWidget'
import { PipelineJobsWidget } from '@/components/widgets/pipeline/PipelineJobsWidget'
import { RecentRunsWidget } from '@/components/widgets/pipeline/RecentRunsWidget'
import { StuckJobsWidget } from '@/components/widgets/pipeline/StuckJobsWidget'

export const pipelineConfig: PageLayoutConfig = {
  pageId: 'pipeline',
  widgets: [
    {
      id: 'pipeline-status',
      title: 'Latest Run',
      component: PipelineStatusWidget,
      defaultSize: { w: 6, h: 4, minH: 3 },
    },
    {
      id: 'pipeline-jobs',
      title: 'Jobs by State',
      component: PipelineJobsWidget,
      defaultSize: { w: 6, h: 4, minH: 3 },
    },
    {
      id: 'recent-runs',
      title: 'Recent Runs',
      component: RecentRunsWidget,
      defaultSize: { w: 8, h: 5, minH: 3 },
    },
    {
      id: 'stuck-jobs',
      title: 'Needs Attention',
      component: StuckJobsWidget,
      defaultSize: { w: 4, h: 5, minH: 3 },
    },
  ],
  defaultLayouts: {
    lg: [
      { i: 'pipeline-status', x: 0, y: 0, w: 6, h: 4, minH: 3 },
      { i: 'pipeline-jobs', x: 6, y: 0, w: 6, h: 4, minH: 3 },
      { i: 'recent-runs', x: 0, y: 4, w: 8, h: 5, minH: 3 },
      { i: 'stuck-jobs', x: 8, y: 4, w: 4, h: 5, minH: 3 },
    ],
    md: [
      { i: 'pipeline-status', x: 0, y: 0, w: 4, h: 4, minH: 3 },
      { i: 'pipeline-jobs', x: 4, y: 0, w: 4, h: 4, minH: 3 },
      { i: 'recent-runs', x: 0, y: 4, w: 8, h: 5, minH: 3 },
      { i: 'stuck-jobs', x: 0, y: 9, w: 8, h: 4, minH: 3 },
    ],
    sm: [
      { i: 'pipeline-status', x: 0, y: 0, w: 4, h: 4, minH: 3 },
      { i: 'pipeline-jobs', x: 0, y: 4, w: 4, h: 4, minH: 3 },
      { i: 'stuck-jobs', x: 0, y: 8, w: 4, h: 4, minH: 3 },
      { i: 'recent-runs', x: 0, y: 12, w: 4, h: 5, minH: 3 },
    ],
  },
}
