export default function Loading() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
