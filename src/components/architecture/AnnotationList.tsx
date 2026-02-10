'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ArchitectureAnnotation } from '@/types/architecture'

interface AnnotationListProps {
  annotations: ArchitectureAnnotation[]
  onResolve: (id: string, resolved: boolean) => void
}

const TYPE_COLORS: Record<string, string> = {
  note: 'bg-blue-500/10 text-blue-400 border-blue-400/30',
  suggestion: 'bg-purple-500/10 text-purple-400 border-purple-400/30',
  task: 'bg-amber-500/10 text-amber-400 border-amber-400/30',
  todo: 'bg-amber-500/10 text-amber-400 border-amber-400/30',
  warning: 'bg-red-500/10 text-red-400 border-red-400/30',
}

const PRIORITY_DOTS: Record<string, string> = {
  low: 'bg-zinc-400',
  normal: 'bg-blue-400',
  high: 'bg-amber-400',
  critical: 'bg-red-400',
}

export function AnnotationList({ annotations, onResolve }: AnnotationListProps) {
  const [showResolved, setShowResolved] = useState(false)

  const visible = showResolved
    ? annotations
    : annotations.filter((a) => !a.resolved)

  const resolvedCount = annotations.filter((a) => a.resolved).length

  if (annotations.length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-mono">
        No annotations yet
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {/* Filter toggle */}
      {resolvedCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">
            {visible.length} annotation{visible.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="xs"
            className="font-mono text-[10px]"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide' : 'Show'} resolved ({resolvedCount})
          </Button>
        </div>
      )}

      {/* Annotation items */}
      {visible.map((annotation) => (
        <div
          key={annotation.id}
          className={`border rounded-md p-2.5 space-y-1.5 transition-opacity ${
            annotation.resolved ? 'opacity-50' : ''
          }`}
        >
          {/* Header: type + priority + resolve */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${TYPE_COLORS[annotation.annotationType] ?? ''}`}
              >
                {annotation.annotationType}
              </Badge>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_DOTS[annotation.priority] ?? 'bg-zinc-400'}`}
                title={annotation.priority}
              />
              <span className="text-[10px] text-muted-foreground font-mono">
                {annotation.author}
              </span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="font-mono text-[10px]"
              onClick={() => onResolve(annotation.id, !annotation.resolved)}
            >
              {annotation.resolved ? 'Reopen' : 'Resolve'}
            </Button>
          </div>

          {/* Content */}
          <p className="text-xs leading-relaxed">{annotation.content}</p>

          {/* Timestamp */}
          <span className="text-[9px] text-muted-foreground font-mono">
            {new Date(annotation.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ))}
    </div>
  )
}
