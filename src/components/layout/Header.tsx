import { Separator } from '@/components/ui/separator'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="font-mono text-lg font-semibold tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <Separator className="mt-3" />
    </div>
  )
}
