'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useHandleLibrary } from '@excalidraw/excalidraw';
import { canvasLibraryAdapter } from '@/lib/canvas-library-adapter';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateLibrary: (opts: any) => Promise<any>;
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
    // useHandleLibrary requires excalidrawAPI as reactive state (not just a ref)
    // so it can detect when the API instance becomes available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

    // Wire up library persistence with localStorage adapter + bundled defaults
    useHandleLibrary({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      excalidrawAPI: excalidrawAPI as any,
      adapter: canvasLibraryAdapter,
    });

    useImperativeHandle(ref, () => ({
      getAPI: () => excalidrawAPI as ExcalidrawAPI | null,
    }), [excalidrawAPI]);

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
            setExcalidrawAPI(api);
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
