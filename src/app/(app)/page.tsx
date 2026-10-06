import Link from "next/link";
import type { Metadata } from "next";
import { Chip, ProgressBar } from "@/components/ui";
import { loadRoute } from "@/lib/data";
import { isCertificationDay } from "@/lib/progress";
import { DoneBanner } from "./done-banner";

export const metadata: Metadata = { title: "Hoy · Study Tracker" };

export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const route = await loadRoute();
  const { hecho } = await searchParams;

  if (route.total === 0) {
    return (
      <main>
        <h1 className="text-xl font-semibold">Sin sesiones.</h1>
        <p className="mt-1 text-[15px] text-stone-600">La agenda no está cargada en la base de datos (falta el seed).</p>
      </main>
    );
  }

  const doneId = typeof hecho === "string" && /^\d+$/.test(hecho) ? Number(hecho) : null;
  const justDone = doneId !== null && route.statusOf(doneId) === "done" ? route.sessions.find((s) => s.id === doneId) : undefined;

  const { current, next } = route;
  const block = current ? route.blockById.get(current.blockId) : undefined;

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="text-stone-600">Hola.</span>
          <span className="font-medium tabular-nums">
            {route.done} / {route.total} · {route.pct}%
          </span>
        </p>
        <ProgressBar value={route.pct} label="Progreso de la ruta" />
      </header>

      {justDone ? (
        <DoneBanner
          sessionId={justDone.id}
          label={`Bloque ${justDone.blockId} · Día ${justDone.day} · ${justDone.title}`}
          canUndo={route.canUndo(justDone.id)}
        />
      ) : null}

      {current ? (
        <section aria-labelledby="hoy-title" className="space-y-3">
          <h1 className="text-sm font-medium text-stone-600">Sesión de hoy</h1>
          <article className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap gap-2">
              <Chip tone="accent">
                Bloque {current.blockId} · Día {current.day} · {current.hours} h
              </Chip>
              {current.hours === 3 ? <Chip>Proyecto</Chip> : null}
              {isCertificationDay(current, block) ? <Chip>Certificación {block?.certificationCode}</Chip> : null}
            </div>
            <h2 id="hoy-title" className="mt-3 text-xl font-semibold leading-snug">
              {current.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-stone-600">{current.description}</p>
            <Link
              href={`/sesion/${current.blockId}/${current.day}`}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-medium text-white hover:bg-accent-strong"
            >
              {route.done === 0 ? "Empezar" : "Continuar"}
            </Link>
          </article>
          {next ? (
            <p className="text-sm text-stone-600">
              Siguiente: Día {next.day}
              {next.blockId !== current.blockId ? ` (Bloque ${next.blockId})` : ""} · {next.title}
            </p>
          ) : null}
        </section>
      ) : (
        <section aria-labelledby="fin-title" className="rounded-xl border border-stone-200 bg-white p-5">
          <h1 id="fin-title" className="text-xl font-semibold">
            Ruta completa.
          </h1>
          <p className="mt-1 text-[15px] text-stone-600">
            {route.done} de {route.total} sesiones hechas.
          </p>
          <ul className="mt-4 divide-y divide-stone-100">
            {route.blocks.map(({ block: b, done, total }) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span className="truncate">
                  Bloque {b.id} · {b.title}
                </span>
                <span className="shrink-0 tabular-nums text-stone-600">
                  {done}/{total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
