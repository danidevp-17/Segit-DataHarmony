export default function GygRoutinesLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent"
        aria-hidden
      />
      <p className="mt-3 text-sm text-slate-500">Cargando rutinas…</p>
    </div>
  );
}
