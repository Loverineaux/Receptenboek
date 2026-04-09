export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted animate-pulse h-64" />
        ))}
      </div>
    </div>
  );
}
