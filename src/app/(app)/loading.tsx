export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">Cargando…</span>
      <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
      <div className="h-44 animate-pulse rounded-xl border border-stone-200 bg-white" />
    </div>
  );
}
