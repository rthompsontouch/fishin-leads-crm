export default function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="px-3 py-3">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-2 rounded-md border border-slate-200 bg-white/80 p-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIdx) => (
              <div key={`${rowIdx}-${colIdx}`} className="h-4 animate-pulse rounded bg-slate-200/85" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
