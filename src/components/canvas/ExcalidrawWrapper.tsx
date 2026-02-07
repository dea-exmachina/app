'use client';

import dynamic from 'next/dynamic';
import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';

// Import Excalidraw CSS
import '@excalidraw/excalidraw/index.css';

// Dynamic import with SSR disabled - Excalidraw requires browser APIs
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full bg-background">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    )
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BinaryFiles = any;

export interface ExcalidrawAPI {
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  getFiles: () => BinaryFiles;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateScene: (scene: any) => void;
  resetScene: () => void;
  scrollToContent: () => void;
}

export interface ExcalidrawWrapperProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any;
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => void;
  viewModeEnabled?: boolean;
  zenModeEnabled?: boolean;
  gridModeEnabled?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export interface ExcalidrawWrapperRef {
  getAPI: () => ExcalidrawAPI | null;
}

export const ExcalidrawWrapper = forwardRef<ExcalidrawWrapperRef, ExcalidrawWrapperProps>(
  function ExcalidrawWrapper(
    {
      initialData,
      onChange,
      viewModeEnabled = false,
      zenModeEnabled = false,
      gridModeEnabled = false,
      theme = 'dark',
      className,
    },
    ref
  ) {
    const apiRef = useRef<ExcalidrawAPI | null>(null);

    useImperativeHandle(ref, () => ({
      getAPI: () => apiRef.current,
    }));

    const handleChange = useCallback(
      (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        onChange?.(elements, appState, files);
      },
      [onChange]
    );

    return (
      <div className={className} style={{ height: '100%', width: '100%' }}>
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api as unknown as ExcalidrawAPI;
          }}
          initialData={initialData}
          onChange={handleChange}
          viewModeEnabled={viewModeEnabled}
          zenModeEnabled={zenModeEnabled}
          gridModeEnabled={gridModeEnabled}
          theme={theme}
          UIOptions={{
            canvasActions: {
              saveAsImage: true,
              loadScene: false,
              export: { saveFileToDisk: true },
              toggleTheme: true,
            },
          }}
        />
      </div>
    );
  }
);
