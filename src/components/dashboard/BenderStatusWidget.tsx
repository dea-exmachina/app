import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStatusColor } from '@/lib/client/formatters'

interface BenderStatusWidgetProps {
  benders: Array<{
    platform: string
    status: string
    activeTasks: number
  }>
}

export function BenderStatusWidget({ benders }: BenderStatusWidgetProps) {
  if (benders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Bender Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active bender platforms
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">Bender Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {benders.map((bender) => (
            <Link
              key={bender.platform}
              href={`/benders/${bender.platform}`}
              className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3 transition-colors hover:border-primary/50"
            >
              <div>
                <div className="font-mono text-sm font-semibold">
                  {bender.platform}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {bender.activeTasks} active{' '}
                  {bender.activeTasks === 1 ? 'task' : 'tasks'}
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-mono"
                style={{
                  borderColor: getStatusColor(bender.status),
                  color: getStatusColor(bender.status),
                }}
              >
                {bender.status}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
