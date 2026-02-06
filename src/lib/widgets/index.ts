/**
 * Widget System Exports
 *
 * Central export point for the widget framework.
 */

// Registry
export {
  WidgetRegistry,
  registerWidget,
  getWidget,
  getAllWidgets,
  getCompatibleWidgets,
  type WidgetDefinition,
  type WidgetProps,
} from './registry'

// Core widgets (auto-registers on import)
export { KanbanWidget, BenderStatusWidget, ChatWidget } from './core-widgets'

// Usage example:
// import { WidgetRegistry, KanbanWidget } from '@/lib/widgets'
// const kanbanDef = WidgetRegistry.get('kanban')
