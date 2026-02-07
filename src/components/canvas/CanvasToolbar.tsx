'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Save, Download, Loader2, Check, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CanvasToolbarProps {
  title: string;
  onTitleChange: (title: string) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onExportJSON?: () => void;
}

export function CanvasToolbar({
  title,
  onTitleChange,
  saveStatus,
  onSave,
  onExportPNG,
  onExportSVG,
  onExportJSON,
}: CanvasToolbarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const handleTitleSubmit = useCallback(() => {
    onTitleChange(editedTitle.trim() || 'Untitled');
    setIsEditingTitle(false);
  }, [editedTitle, onTitleChange]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSubmit();
      } else if (e.key === 'Escape') {
        setEditedTitle(title);
        setIsEditingTitle(false);
      }
    },
    [handleTitleSubmit, title]
  );

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center gap-4">
        <Link href="/canvas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            className="w-64 h-8 px-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setEditedTitle(title);
              setIsEditingTitle(true);
            }}
            className="text-lg font-semibold hover:text-primary transition-colors"
          >
            {title}
          </button>
        )}

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span>Error saving</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>

        <div className="flex items-center gap-1">
          {onExportPNG && (
            <Button variant="ghost" size="sm" onClick={onExportPNG}>
              <Download className="h-4 w-4 mr-1" />
              PNG
            </Button>
          )}
          {onExportSVG && (
            <Button variant="ghost" size="sm" onClick={onExportSVG}>
              SVG
            </Button>
          )}
          {onExportJSON && (
            <Button variant="ghost" size="sm" onClick={onExportJSON}>
              JSON
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
