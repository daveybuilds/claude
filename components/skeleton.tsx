export function FinderSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="h-10 w-14 rounded-full" />
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-10 w-24 rounded-full bg-bg-deep" />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-64 rounded-[var(--radius-card)] bg-bg-deep" />
        ))}
      </div>
    </div>
  );
}
