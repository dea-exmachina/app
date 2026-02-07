'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CanvasSummary } from '@/types/canvas';

interface CanvasCardProps {
  canvas: CanvasSummary;
  onDelete?: (id: string) => void;
}

export function CanvasCard({ canvas, onDelete }: CanvasCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(canvas.updated_at), {
    addSuffix: true,
  });

  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <Link href={`/canvas/${canvas.id}`} className="flex-1">
          <CardTitle className="text-base font-medium hover:text-primary transition-colors">
            {canvas.title}
          </CardTitle>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/canvas/${canvas.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(canvas.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <Link href={`/canvas/${canvas.id}`}>
          {canvas.thumbnail ? (
            <div className="aspect-video bg-muted rounded-md overflow-hidden mb-3">
              <img
                src={canvas.thumbnail}
                alt={canvas.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-3">
              <span className="text-muted-foreground text-sm">
                {canvas.element_count ?? 0} elements
              </span>
            </div>
          )}
        </Link>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Updated {updatedAgo}</span>
          {canvas.description && (
            <span className="truncate max-w-[150px]">{canvas.description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
