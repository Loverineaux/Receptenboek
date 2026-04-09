export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-muted animate-pulse h-32" />
        ))}
      </div>
    </div>
  );
}
