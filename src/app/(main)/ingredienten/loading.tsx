export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-input bg-sunk" />
      <div className="h-11 animate-pulse rounded-input bg-sunk" />
      <div className="h-[330px] animate-pulse rounded-card-lg bg-sunk" />
    </div>
  );
}
