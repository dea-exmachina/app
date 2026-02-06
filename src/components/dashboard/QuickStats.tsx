import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface QuickStatsProps {
  boardCount: number
  skillCount: number
  workflowCount: number
  benderCount: number
}

export function QuickStats({
  boardCount,
  skillCount,
  workflowCount,
  benderCount,
}: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Boards" value={boardCount} subtitle="kanban boards" />
      <StatCard title="Skills" value={skillCount} subtitle="registered skills" />
      <StatCard
        title="Workflows"
        value={workflowCount}
        subtitle="active workflows"
      />
      <StatCard
        title="Benders"
        value={benderCount}
        subtitle="agent platforms"
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: number
  subtitle: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-xs text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
