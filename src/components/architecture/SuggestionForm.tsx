'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ArchitectureTier, AnnotationType, AnnotationPriority } from '@/types/architecture'

interface SuggestionFormProps {
  targetId: string
  targetTier: ArchitectureTier
  onSubmit: () => void
}

const ANNOTATION_TYPES: { value: AnnotationType; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'task', label: 'Task' },
  { value: 'warning', label: 'Warning' },
]

const PRIORITIES: { value: AnnotationPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function SuggestionForm({ targetId, targetTier, onSubmit }: SuggestionFormProps) {
  const [annotationType, setAnnotationType] = useState<AnnotationType>('suggestion')
  const [priority, setPriority] = useState<AnnotationPriority>('normal')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/architecture/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'node',
          targetId,
          targetTier,
          annotationType,
          content: content.trim(),
          author: 'george',
          priority,
        }),
      })

      if (res.ok) {
        setContent('')
        setExpanded(false)
        onSubmit()
      }
    } catch (err) {
      console.error('Failed to create annotation:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="font-mono text-xs w-full"
        onClick={() => setExpanded(true)}
      >
        + Add annotation
      </Button>
    )
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      {/* Pre-populated context */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono">node:</span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {targetId}
        </Badge>
        <span className="font-mono">tier:</span>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {targetTier}
        </Badge>
      </div>

      {/* Type selector */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground w-10">Type:</span>
        {ANNOTATION_TYPES.map((t) => (
          <Button
            key={t.value}
            variant={annotationType === t.value ? 'secondary' : 'ghost'}
            size="xs"
            className="font-mono text-[10px]"
            onClick={() => setAnnotationType(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Priority selector */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground w-10">Prio:</span>
        {PRIORITIES.map((p) => (
          <Button
            key={p.value}
            variant={priority === p.value ? 'secondary' : 'ghost'}
            size="xs"
            className="font-mono text-[10px]"
            onClick={() => setPriority(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Describe the annotation, suggestion, or task..."
        className="w-full h-20 text-sm bg-background border rounded-md p-2 resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      />

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            setExpanded(false)
            setContent('')
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
