import { Header } from '@/components/layout/Header'

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <Header
        title="Skills"
        description="Category-grouped skill browser"
      />
      <p className="font-mono text-sm text-muted-foreground">
        Skill grid will render here. Connect data source to load skills.
      </p>
    </div>
  )
}
