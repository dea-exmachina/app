import { Header } from '@/components/layout/Header'

export default function BendersPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Benders"
        description="Platform overview and task management"
      />
      <p className="font-mono text-sm text-muted-foreground">
        Bender panel will render here. Connect data source to load platforms.
      </p>
    </div>
  )
}
