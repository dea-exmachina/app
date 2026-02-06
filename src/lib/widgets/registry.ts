/**
 * Widget Registry
 *
 * Central registry for all available dashboard widgets.
 * Meta-framework compliant: extensible, pluggable, user-customizable.
 */

import { ComponentType } from 'react'
import type { WidgetType } from '@/types/project'

/**
 * Widget definition metadata
 */
export interface WidgetDefinition {
  type: WidgetType
  name: string
  description: string
  component: ComponentType<WidgetProps>

  // Project type support (empty = all types)
  supportedProjectTypes: string[]

  // Connector requirements
  requiredConnectors: string[]  // Widget won't work without these
  optionalConnectors: string[]  // Enhances widget if available

  // Default configuration
  defaultConfig: Record<string, any>
  defaultSize: { width: number; height: number } // Grid units

  // Icon for widget picker
  icon?: string // Lucide icon name
}

/**
 * Props passed to all widget components
 */
export interface WidgetProps {
  projectId: string
  config: Record<string, any>
  onConfigChange?: (config: Record<string, any>) => void
  editMode?: boolean
}

/**
 * Widget Registry
 * Maps widget type to definition
 */
class WidgetRegistryClass {
  private widgets: Map<WidgetType, WidgetDefinition> = new Map()

  /**
   * Register a widget
   * @param definition Widget definition
   */
  register(definition: WidgetDefinition): void {
    this.widgets.set(definition.type, definition)
  }

  /**
   * Get widget definition by type
   * @param type Widget type
   */
  get(type: WidgetType): WidgetDefinition | undefined {
    return this.widgets.get(type)
  }

  /**
   * Get all registered widgets
   */
  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values())
  }

  /**
   * Get widgets compatible with project type
   * @param projectType Project type (software, content, etc.)
   */
  getCompatibleWidgets(projectType: string): WidgetDefinition[] {
    return this.getAll().filter(
      (widget) =>
        widget.supportedProjectTypes.length === 0 || // Universal widget
        widget.supportedProjectTypes.includes(projectType)
    )
  }

  /**
   * Check if widget is available (connectors satisfied)
   * @param type Widget type
   * @param availableConnectors List of available connector slugs
   */
  isAvailable(
    type: WidgetType,
    availableConnectors: string[]
  ): boolean {
    const widget = this.get(type)
    if (!widget) return false

    // All required connectors must be available
    return widget.requiredConnectors.every((connector) =>
      availableConnectors.includes(connector)
    )
  }
}

// Singleton instance
export const WidgetRegistry = new WidgetRegistryClass()

// Export for convenience
export const registerWidget = (definition: WidgetDefinition) =>
  WidgetRegistry.register(definition)
export const getWidget = (type: WidgetType) => WidgetRegistry.get(type)
export const getAllWidgets = () => WidgetRegistry.getAll()
export const getCompatibleWidgets = (projectType: string) =>
  WidgetRegistry.getCompatibleWidgets(projectType)
