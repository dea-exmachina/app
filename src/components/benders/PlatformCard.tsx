import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BenderPlatform } from '@/types/bender'
import { getStatusColor } from '@/lib/client/formatters'

interface PlatformCardProps {
  platform: BenderPlatform
}

export function PlatformCard({ platform }: PlatformCardProps) {
  return (
    <Link href={`/benders/${platform.slug}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{platform.name}</CardTitle>
            <Badge
              variant="outline"
              className="shrink-0 font-mono text-xs"
              style={{
                borderColor: getStatusColor(platform.status),
                color: getStatusColor(platform.status),
              }}
            >
              {platform.status}
            </Badge>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {platform.slug}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Interface & Cost */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {platform.interface}
            </Badge>
            <Badge
              variant="outline"
              className="font-mono text-xs"
              style={{
                borderColor:
                  platform.costTier === 'cheap'
                    ? '#7BAD8E'
                    : platform.costTier === 'expensive'
                      ? '#AD7B7B'
                      : '#9B8E7B',
                color:
                  platform.costTier === 'cheap'
                    ? '#7BAD8E'
                    : platform.costTier === 'expensive'
                      ? '#AD7B7B'
                      : '#9B8E7B',
              }}
            >
              {platform.costTier}
            </Badge>
          </div>

          {/* Models */}
          <div>
            <h4 className="mb-1 font-mono text-xs text-muted-foreground">
              Models
            </h4>
            <div className="flex flex-wrap gap-1">
              {platform.models.map((model) => (
                <span
                  key={model}
                  className="font-mono text-xs text-foreground/80"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {platform.strengths.length > 0 && (
            <div>
              <h4 className="mb-1 font-mono text-xs text-muted-foreground">
                Strengths
              </h4>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-foreground/90">
                {platform.strengths.slice(0, 2).map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
