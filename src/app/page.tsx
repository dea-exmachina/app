import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        description="dea-exmachina control center"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard title="Boards" value="--" subtitle="kanban boards" />
        <StatusCard title="Skills" value="--" subtitle="registered skills" />
        <StatusCard title="Workflows" value="--" subtitle="active workflows" />
        <StatusCard title="Benders" value="--" subtitle="agent platforms" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Mission Briefing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect a data source to load the latest handoff context.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
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
