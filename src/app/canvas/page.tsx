'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { CanvasCard } from '@/components/canvas/CanvasCard';
import { Button } from '@/components/ui/button';
import { getCanvases, deleteCanvas } from '@/lib/client/api';
import type { CanvasSummary } from '@/types/canvas';

export default function CanvasListPage() {
  const [canvases, setCanvases] = useState<CanvasSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCanvases = useCallback(async () => {
    try {
      const { data } = await getCanvases();
      setCanvases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canvases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this canvas?')) {
      return;
    }

    try {
      await deleteCanvas(id);
      setCanvases((prev) => prev?.filter((c) => c.id !== id) ?? null);
    } catch (err) {
      console.error('Failed to delete canvas:', err);
      alert('Failed to delete canvas');
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="Canvas"
          description="Whiteboard and diagramming workspace"
        />
        <div className="text-sm text-muted-foreground">Loading canvases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header
          title="Canvas"
          description="Whiteboard and diagramming workspace"
        />
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header
          title="Canvas"
          description="Whiteboard and diagramming workspace"
        />
        <Link href="/canvas/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Canvas
          </Button>
        </Link>
      </div>

      {canvases && canvases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No canvases yet</p>
          <Link href="/canvas/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create your first canvas
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {canvases?.map((canvas) => (
            <CanvasCard
              key={canvas.id}
              canvas={canvas}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
