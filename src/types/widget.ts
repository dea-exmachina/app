import type { ComponentType } from 'react'
import type {
  LayoutItem as RGLLayoutItem,
  Layout as RGLLayout,
  ResponsiveLayouts as RGLResponsiveLayouts,
} from 'react-grid-layout'

// Re-export the library's types for consistency
export type LayoutItem = RGLLayoutItem
export type Layout = RGLLayout
export type Layouts = RGLResponsiveLayouts

export interface WidgetDefinition {
  id: string
  title: string
  component: ComponentType<Record<string, unknown>>
  defaultSize: {
    w: number
    h: number
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
  }
}

export interface PageLayoutConfig {
  pageId: string
  widgets: WidgetDefinition[]
  defaultLayouts: Layouts
}
