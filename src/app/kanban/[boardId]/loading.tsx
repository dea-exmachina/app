export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-80 shrink-0 space-y-3">
            <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-32 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
