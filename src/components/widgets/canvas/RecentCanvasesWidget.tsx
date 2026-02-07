'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Plus, PenTool } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getCanvases } from '@/lib/client/api';
import type { CanvasSummary } from '@/types/canvas';

export function RecentCanvasesWidget() {
  const [canvases, setCanvases] = useState<CanvasSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCanvases()
      .then((res) => setCanvases(res.data.slice(0, 4)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load canvases: {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Link
          href="/canvas"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </Link>
        <Link href="/canvas/new">
          <Button size="sm" variant="outline">
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </Link>
      </div>

      {canvases && canvases.length === 0 ? (
        <div className="text-center py-4">
          <PenTool className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No canvases yet</p>
          <Link href="/canvas/new">
            <Button size="sm" className="mt-2">
              Create your first
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {canvases?.map((canvas) => (
            <Link
              key={canvas.id}
              href={`/canvas/${canvas.id}`}
              className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <PenTool className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {canvas.title}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(canvas.updated_at), {
                  addSuffix: true,
                })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
