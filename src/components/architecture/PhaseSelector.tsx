'use client'

import { Button } from '@/components/ui/button'
import { PHASES } from '@/lib/architecture/nodes'

interface PhaseSelectorProps {
  selectedPhase: number | null
  onPhaseChange: (phase: number | null) => void
}

export function PhaseSelector({ selectedPhase, onPhaseChange }: PhaseSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">Phase:</span>
      {PHASES.map((phase) => {
        const isActive = selectedPhase === phase.id
        return (
          <Button
            key={phase.id ?? 'all'}
            variant={isActive ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => onPhaseChange(phase.id)}
            className="font-mono"
            title={phase.description}
          >
            {phase.id !== null ? phase.id : 'All'}
          </Button>
        )
      })}
    </div>
  )
}
