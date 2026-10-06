import Link from "next/link";
import type { Metadata } from "next";
import { BlockBadge, ProgressBar } from "@/components/ui";
import { loadRoute } from "@/lib/data";

export const metadata: Metadata = { title: "Ruta · Study Tracker" };

export default async function RutaPage() {
  const route = await loadRoute();

  return (
    <main>
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Ruta</h1>
        <p className="text-[15px] font-medium tabular-nums">
          {route.done} / {route.total} · {route.pct}%
        </p>
      </header>

      <ul className="mt-5 space-y-3">
        {route.blocks.map(({ block, done, total, pct, state }) => (
          <li key={block.id}>
            <Link
              href={`/ruta/${block.id}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-300"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-stone-600">Bloque {block.id}</span>
                <BlockBadge state={state} />
              </div>
              <h2 className="mt-1 text-[17px] font-semibold leading-snug">{block.title}</h2>
              <p className="mt-0.5 truncate text-sm text-stone-600">{block.goal}</p>
              {block.certificationCode ? (
                <p className="mt-0.5 text-sm text-stone-600">
                  {block.certificationCode} · día {block.certificationDay}
                </p>
              ) : null}
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={pct} label={`Progreso del bloque ${block.id}`} />
                <span className="shrink-0 text-sm tabular-nums text-stone-600">
                  {done}/{total}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
