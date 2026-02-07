'use client';

import { use } from 'react';
import { CanvasEditor } from '@/components/canvas';
import { useCanvas } from '@/hooks/useCanvas';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CanvasPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: canvas, loading, error } = useCanvas(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">
          {error || 'Canvas not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <CanvasEditor canvas={canvas} />
    </div>
  );
}
