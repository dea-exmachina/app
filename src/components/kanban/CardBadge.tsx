import { Badge } from '@/components/ui/badge'

interface CardBadgeProps {
  tag: string
}

export function CardBadge({ tag }: CardBadgeProps) {
  return (
    <Badge variant="terminal">
      {tag}
    </Badge>
  )
}
