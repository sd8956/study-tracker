"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-stone-200 bg-white p-5">
      <h1 className="text-lg font-semibold">No se pudo cargar.</h1>
      <p className="mt-1 text-[15px] text-stone-600">
        Si editaste el contenido, corre <code>npm test</code>: el test de contenido dice qué archivo tiene el error. El detalle
        también aparece en la terminal donde corre la app.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
      >
        Reintentar
      </button>
    </div>
  );
}
