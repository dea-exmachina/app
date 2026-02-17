import type { PageLayoutConfig } from '@/types/widget'
import { ProjectQuickStatsWidget } from '@/components/widgets/project-detail/ProjectQuickStatsWidget'
import { ProjectBriefWidget } from '@/components/widgets/project-detail/ProjectBriefWidget'
import { ProjectKanbanSummaryWidget } from '@/components/widgets/project-detail/ProjectKanbanSummaryWidget'
import { ProjectTeamWidget } from '@/components/widgets/project-detail/ProjectTeamWidget'
import { ProjectTaskListWidget } from '@/components/widgets/project-detail/ProjectTaskListWidget'
import { ProjectNotesWidget } from '@/components/widgets/project-detail/ProjectNotesWidget'
import { ProjectLinksWidget } from '@/components/widgets/project-detail/ProjectLinksWidget'
import { ProjectTechStackWidget } from '@/components/widgets/project-detail/ProjectTechStackWidget'
import { ProjectWorkflowsWidget } from '@/components/widgets/project-detail/ProjectWorkflowsWidget'
import { ProjectInboxWidget } from '@/components/widgets/project-detail/ProjectInboxWidget'

export function createProjectDetailConfig(slug: string): PageLayoutConfig {
  return {
    pageId: `project-${slug}`,
    widgets: [
      {
        id: 'quick-stats',
        title: 'Status',
        component: ProjectQuickStatsWidget,
        defaultSize: { w: 12, h: 1, minH: 1, maxH: 2 },
      },
      {
        id: 'brief',
        title: 'Brief',
        component: ProjectBriefWidget,
        defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
      },
      {
        id: 'links',
        title: 'Links',
        component: ProjectLinksWidget,
        defaultSize: { w: 3, h: 4, minW: 2, minH: 3 },
      },
      {
        id: 'kanban-summary',
        title: 'Kanban',
        component: ProjectKanbanSummaryWidget,
        defaultSize: { w: 3, h: 4, minW: 2, minH: 3 },
      },
      {
        id: 'team',
        title: 'Team',
        component: ProjectTeamWidget,
        defaultSize: { w: 2, h: 4, minW: 2, minH: 2 },
      },
      {
        id: 'task-list',
        title: 'Open Tasks',
        component: ProjectTaskListWidget,
        defaultSize: { w: 8, h: 5, minW: 4, minH: 3 },
      },
      {
        id: 'notes',
        title: 'Notes',
        component: ProjectNotesWidget,
        defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
      },
      {
        id: 'tech-stack',
        title: 'Tech Stack',
        component: ProjectTechStackWidget,
        defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
      },
      {
        id: 'workflows',
        title: 'Workflows',
        component: ProjectWorkflowsWidget,
        defaultSize: { w: 4, h: 5, minW: 3, minH: 3 },
      },
      {
        id: 'inbox',
        title: 'Inbox',
        component: ProjectInboxWidget,
        defaultSize: { w: 6, h: 5, minW: 3, minH: 3 },
      },
    ],
    defaultLayouts: {
      lg: [
        { i: 'quick-stats', x: 0, y: 0, w: 12, h: 1, minH: 1, maxH: 2 },
        { i: 'brief', x: 0, y: 1, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'links', x: 4, y: 1, w: 3, h: 4, minW: 2, minH: 3 },
        { i: 'kanban-summary', x: 7, y: 1, w: 3, h: 4, minW: 2, minH: 3 },
        { i: 'team', x: 10, y: 1, w: 2, h: 4, minW: 2, minH: 2 },
        { i: 'task-list', x: 0, y: 5, w: 8, h: 5, minW: 4, minH: 3 },
        { i: 'notes', x: 8, y: 5, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'tech-stack', x: 0, y: 10, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'workflows', x: 4, y: 10, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'inbox', x: 8, y: 10, w: 4, h: 5, minW: 3, minH: 3 },
      ],
      md: [
        { i: 'quick-stats', x: 0, y: 0, w: 8, h: 1, minH: 1, maxH: 2 },
        { i: 'brief', x: 0, y: 1, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'links', x: 4, y: 1, w: 4, h: 4, minW: 2, minH: 3 },
        { i: 'kanban-summary', x: 0, y: 5, w: 4, h: 4, minW: 2, minH: 3 },
        { i: 'team', x: 4, y: 5, w: 4, h: 4, minW: 2, minH: 2 },
        { i: 'task-list', x: 0, y: 9, w: 8, h: 5, minW: 4, minH: 3 },
        { i: 'notes', x: 0, y: 14, w: 8, h: 5, minW: 3, minH: 3 },
        { i: 'tech-stack', x: 0, y: 19, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'workflows', x: 4, y: 19, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'inbox', x: 0, y: 24, w: 8, h: 5, minW: 3, minH: 3 },
      ],
      sm: [
        { i: 'quick-stats', x: 0, y: 0, w: 4, h: 2, minH: 1 },
        { i: 'brief', x: 0, y: 2, w: 4, h: 5, minW: 4, minH: 3 },
        { i: 'links', x: 0, y: 7, w: 4, h: 4, minW: 2, minH: 3 },
        { i: 'kanban-summary', x: 0, y: 11, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'team', x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 2 },
        { i: 'task-list', x: 0, y: 20, w: 4, h: 6, minW: 4, minH: 3 },
        { i: 'notes', x: 0, y: 26, w: 4, h: 6, minW: 3, minH: 3 },
        { i: 'tech-stack', x: 0, y: 32, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'workflows', x: 0, y: 37, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'inbox', x: 0, y: 42, w: 4, h: 5, minW: 3, minH: 3 },
      ],
    },
  }
}
