/** Route-level skeleton shown while a page's server data loads. Lives inside the app shell. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-canvas" />
        <div className="h-8 w-64 rounded bg-canvas" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg border border-border bg-surface shadow-card">
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 rounded bg-canvas" />
              <div className="h-5 w-3/4 rounded bg-canvas" />
              <div className="h-4 w-1/2 rounded bg-canvas" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
