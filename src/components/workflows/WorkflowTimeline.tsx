'use client'

import { useState, useMemo } from 'react'
import type { WorkflowSection } from '@/types/workflow'

interface WorkflowTimelineProps {
  sections: WorkflowSection[]
}

export function WorkflowTimeline({ sections }: WorkflowTimelineProps) {
  // Filter to top-level steps (h2 sections)
  const steps = useMemo(
    () => sections.filter((s) => s.level === 2),
    [sections]
  )

  // Build step groups: each h2 includes its h3+ children
  const stepGroups = useMemo(() => {
    const groups: { step: WorkflowSection; children: WorkflowSection[] }[] = []
    let current: { step: WorkflowSection; children: WorkflowSection[] } | null = null

    for (const section of sections) {
      if (section.level === 2) {
        if (current) groups.push(current)
        current = { step: section, children: [] }
      } else if (current) {
        current.children.push(section)
      }
    }
    if (current) groups.push(current)
    return groups
  }, [sections])

  // Default: all open ≤4 steps, first open >4
  const [openSteps, setOpenSteps] = useState<Set<number>>(() => {
    if (steps.length <= 4) {
      return new Set(steps.map((_, i) => i))
    }
    return new Set([0])
  })

  const toggleStep = (index: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  if (stepGroups.length === 0) return null

  return (
    <div className="space-y-1">
      {/* Step count + mini dot navigator */}
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          {stepGroups.length} {stepGroups.length === 1 ? 'step' : 'steps'}
        </span>
        <div className="flex items-center gap-1">
          {stepGroups.map((_, i) => (
            <button
              key={i}
              onClick={() => toggleStep(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                openSteps.has(i)
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
              }`}
              title={`Step ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {stepGroups.map((group, i) => {
          const isOpen = openSteps.has(i)
          const isLast = i === stepGroups.length - 1

          return (
            <div key={i} className="relative flex gap-4">
              {/* Timeline column: circle + connecting line */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => toggleStep(i)}
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-semibold transition-colors ${
                    isOpen
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/40 bg-background text-muted-foreground hover:border-primary/60'
                  }`}
                >
                  {i + 1}
                </button>
                {!isLast && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <button
                  onClick={() => toggleStep(i)}
                  className="mb-1 flex w-full items-center gap-2 text-left"
                >
                  <h3 className="font-semibold text-sm">{group.step.heading}</h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {isOpen ? '\u25B4' : '\u25BE'}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-3 pb-2">
                    {/* Step content */}
                    {group.step.content && (
                      <div
                        className="text-sm text-muted-foreground whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: group.step.content }}
                      />
                    )}

                    {/* Child sections (h3+) */}
                    {group.children.map((child, j) => (
                      <div key={j} className="ml-2 border-l-2 border-border pl-3">
                        <h4 className="mb-1 text-xs font-semibold text-muted-foreground">
                          {child.heading}
                        </h4>
                        {child.content && (
                          <div
                            className="text-sm text-muted-foreground whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: child.content }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
