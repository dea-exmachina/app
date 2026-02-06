/**
 * Core Widget Registrations
 *
 * Registers the 3 core widgets: Kanban, Bender Status, Chat.
 * Import this file to auto-register all core widgets.
 */

import { registerWidget } from './registry'
import { KanbanWidget } from '@/components/widgets/core/KanbanWidget'
import { BenderStatusWidget } from '@/components/widgets/core/BenderStatusWidget'
import { ChatWidget } from '@/components/widgets/core/ChatWidget'

// Register Kanban Widget
registerWidget({
  type: 'kanban',
  name: 'Kanban Board',
  description: 'Task tracking with lanes and cards',
  component: KanbanWidget,
  supportedProjectTypes: [], // Universal
  requiredConnectors: [],
  optionalConnectors: ['todoist', 'linear', 'jira'], // External sync
  defaultConfig: {
    lanes: ['Inbox', 'Ready', 'In Progress', 'Review', 'Done'],
    showCompleted: true,
  },
  defaultSize: { width: 4, height: 3 },
  icon: 'KanbanSquare',
})

// Register Bender Status Widget
registerWidget({
  type: 'bender-status',
  name: 'Bender Status',
  description: 'Active benders, task queue, platform health',
  component: BenderStatusWidget,
  supportedProjectTypes: [], // Universal
  requiredConnectors: [],
  optionalConnectors: [],
  defaultConfig: {
    showPlatformHealth: true,
    showTaskQueue: true,
  },
  defaultSize: { width: 2, height: 2 },
  icon: 'Bot',
})

// Register Chat Widget
registerWidget({
  type: 'chat',
  name: 'Chat with dea',
  description: 'Real-time messaging interface',
  component: ChatWidget,
  supportedProjectTypes: [], // Universal
  requiredConnectors: [],
  optionalConnectors: [],
  defaultConfig: {
    showHistory: true,
    markdownEnabled: true,
  },
  defaultSize: { width: 3, height: 2 },
  icon: 'MessageSquare',
})

// Export for convenience
export { KanbanWidget, BenderStatusWidget, ChatWidget }
