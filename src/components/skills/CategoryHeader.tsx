interface CategoryHeaderProps {
  category: string
  count: number
  color: string
}

export function CategoryHeader({
  category,
  count,
  color,
}: CategoryHeaderProps) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2
        className="text-base font-semibold"
        style={{
          borderLeft: `3px solid ${color}`,
          paddingLeft: '0.75rem',
        }}
      >
        {category}
      </h2>
      <span className="font-mono text-xs text-muted-foreground">
        {count} {count === 1 ? 'skill' : 'skills'}
      </span>
    </div>
  )
}
