import { Badge } from '@/components/ui/badge'
import { getTagColor } from '@/lib/client/formatters'

interface CardBadgeProps {
  tag: string
}

export function CardBadge({ tag }: CardBadgeProps) {
  const color = getTagColor(tag)

  return (
    <Badge
      variant="outline"
      className="font-mono text-xs"
      style={{
        borderColor: color,
        color: color,
      }}
    >
      {tag}
    </Badge>
  )
}
