/**
 * Canvas Types
 *
 * Types for the Excalidraw whiteboard feature.
 */

/**
 * Canvas record from database
 */
export interface Canvas {
  id: string;
  title: string;
  description: string | null;
  data: CanvasData;
  thumbnail: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Excalidraw scene data stored in canvas.data
 */
export interface CanvasData {
  elements?: CanvasElement[];
  appState?: CanvasAppState;
  files?: Record<string, CanvasFile>;
}

/**
 * Excalidraw element (simplified type)
 */
export interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

/**
 * Excalidraw app state (simplified type)
 */
export interface CanvasAppState {
  zoom?: { value: number };
  scrollX?: number;
  scrollY?: number;
  theme?: 'light' | 'dark';
  viewBackgroundColor?: string;
  gridSize?: number;
  [key: string]: unknown;
}

/**
 * Excalidraw file (for embedded images)
 */
export interface CanvasFile {
  mimeType: string;
  id: string;
  dataURL: string;
  created: number;
}

/**
 * Canvas summary for list views (without full data)
 */
export interface CanvasSummary {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  element_count?: number;
}

/**
 * Create canvas input
 */
export interface CreateCanvasInput {
  title?: string;
  description?: string;
  project_id?: string;
  data?: CanvasData;
}

/**
 * Update canvas input
 */
export interface UpdateCanvasInput {
  title?: string;
  description?: string;
  data?: CanvasData;
  thumbnail?: string;
  project_id?: string | null;
}
