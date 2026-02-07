'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ExcalidrawWrapper, type ExcalidrawWrapperRef } from './ExcalidrawWrapper';
import { CanvasToolbar, type SaveStatus } from './CanvasToolbar';
import { updateCanvas } from '@/lib/client/api';
import type { Canvas, CanvasData } from '@/types/canvas';

interface CanvasEditorProps {
  canvas: Canvas;
  onUpdate?: (canvas: Canvas) => void;
}

export function CanvasEditor({ canvas, onUpdate }: CanvasEditorProps) {
  const [title, setTitle] = useState(canvas.title);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const excalidrawRef = useRef<ExcalidrawWrapperRef>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>(JSON.stringify(canvas.data));

  // Auto-save with debounce
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements: readonly any[], appState: any, files: any) => {
      const newData: CanvasData = {
        elements: [...elements],
        appState: {
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          theme: appState.theme,
          viewBackgroundColor: appState.viewBackgroundColor,
        },
        files,
      };

      const newDataStr = JSON.stringify(newData);

      // Only trigger save if data actually changed
      if (newDataStr === lastSavedDataRef.current) {
        return;
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus('saving');

      // Debounce save by 2 seconds
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const { data: updated } = await updateCanvas(canvas.id, { data: newData });
          lastSavedDataRef.current = newDataStr;
          setSaveStatus('saved');
          onUpdate?.(updated);

          // Reset to idle after showing "saved" briefly
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
          console.error('Failed to save canvas:', error);
          setSaveStatus('error');
        }
      }, 2000);
    },
    [canvas.id, onUpdate]
  );

  // Manual save (immediate)
  const handleManualSave = useCallback(async () => {
    const api = excalidrawRef.current?.getAPI();
    if (!api) return;

    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();

    const newData: CanvasData = {
      elements: elements as CanvasData['elements'],
      appState: {
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        theme: appState.theme,
        viewBackgroundColor: appState.viewBackgroundColor,
      },
      files,
    };

    // Clear any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');

    try {
      const { data: updated } = await updateCanvas(canvas.id, {
        title,
        data: newData,
      });
      lastSavedDataRef.current = JSON.stringify(newData);
      setSaveStatus('saved');
      onUpdate?.(updated);

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save canvas:', error);
      setSaveStatus('error');
    }
  }, [canvas.id, title, onUpdate]);

  // Handle title change
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);

      try {
        await updateCanvas(canvas.id, { title: newTitle });
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    },
    [canvas.id]
  );

  // Export functions
  const handleExportPNG = useCallback(async () => {
    const api = excalidrawRef.current?.getAPI();
    if (!api) return;

    try {
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
        mimeType: 'image/png',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  }, [title]);

  const handleExportSVG = useCallback(async () => {
    const api = excalidrawRef.current?.getAPI();
    if (!api) return;

    try {
      const { exportToSvg } = await import('@excalidraw/excalidraw');
      const svg = await exportToSvg({
        elements: api.getSceneElements(),
        appState: api.getAppState(),
        files: api.getFiles(),
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export SVG:', error);
    }
  }, [title]);

  const handleExportJSON = useCallback(async () => {
    const api = excalidrawRef.current?.getAPI();
    if (!api) return;

    try {
      const { serializeAsJSON } = await import('@excalidraw/excalidraw');
      const json = serializeAsJSON(
        api.getSceneElements(),
        api.getAppState(),
        api.getFiles(),
        'local'
      );

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.excalidraw`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
    }
  }, [title]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <CanvasToolbar
        title={title}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        onSave={handleManualSave}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
      />

      <div className="flex-1">
        <ExcalidrawWrapper
          ref={excalidrawRef}
          initialData={canvas.data}
          onChange={handleChange}
          theme="dark"
        />
      </div>
    </div>
  );
}
