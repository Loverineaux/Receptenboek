export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
