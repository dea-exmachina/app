interface CardMetadataProps {
  metadata: Record<string, string>
}

export function CardMetadata({ metadata }: CardMetadataProps) {
  const entries = Object.entries(metadata)
  if (entries.length === 0) return null

  return (
    <div className="space-y-1 border-t border-border pt-2 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="font-mono text-muted-foreground">{key}:</span>
          <span className="font-mono text-foreground/80">{value}</span>
        </div>
      ))}
    </div>
  )
}
