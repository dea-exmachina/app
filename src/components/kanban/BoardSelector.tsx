import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BoardSummary } from '@/types/kanban'

interface BoardSelectorProps {
  boards: BoardSummary[]
}

export function BoardSelector({ boards }: BoardSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <Link key={board.id} href={`/kanban/${board.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">{board.name}</CardTitle>
              <div className="font-mono text-xs text-muted-foreground">
                {board.id}
              </div>
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
                <span className="text-xs text-muted-foreground">completed</span>
              </div>

              {/* Lane Stats */}
              <div className="space-y-1.5">
                {board.laneStats.map((lane) => (
                  <div
                    key={lane.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {lane.name}
                    </span>
                    <span className="font-mono">
                      {lane.total - lane.completed}
                      <span className="text-muted-foreground">
                        {' '}
                        / {lane.total}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
