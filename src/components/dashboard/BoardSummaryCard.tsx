import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BoardSummary } from '@/types/kanban'

interface BoardSummaryCardProps {
  board: BoardSummary
}

export function BoardSummaryCard({ board }: BoardSummaryCardProps) {
  return (
    <Link href={`/kanban/${board.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{board.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Total Stats */}
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold">
              {board.totalOpen}
            </span>
            <span className="text-xs text-muted-foreground">open</span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="font-mono text-sm text-muted-foreground">
              {board.totalCompleted}
            </span>
            <span className="text-xs text-muted-foreground">done</span>
          </div>

          {/* Lane Breakdown */}
          <div className="space-y-1">
            {board.laneStats.map((lane) => (
              <div key={lane.name} className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground w-20 truncate">
                  {lane.name}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/60"
                    style={{
                      width: `${lane.total > 0 ? (lane.completed / lane.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                  {lane.total}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
