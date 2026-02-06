'use client'

import { Lock, Unlock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLayout } from '@/contexts/LayoutContext'

interface WidgetToolbarProps {
  pageId: string
}

export function WidgetToolbar({ pageId }: WidgetToolbarProps) {
  const { editMode, toggleEditMode, resetLayout } = useLayout()

  return (
    <TooltipProvider>
      <div className="mb-4 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleEditMode}
              className="gap-2"
            >
              {editMode ? (
                <>
                  <Unlock className="h-4 w-4" />
                  <span className="font-mono text-xs">Edit Mode</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span className="font-mono text-xs">Locked</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">
              {editMode ? 'Lock layout' : 'Unlock to edit layout'}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetLayout(pageId)}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="font-mono text-xs">Reset</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">Reset to default layout</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
