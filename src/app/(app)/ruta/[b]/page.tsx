import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackIcon, CheckIcon } from "@/components/icons";
import { BlockBadge, Chip, ProgressBar } from "@/components/ui";
import { loadRoute } from "@/lib/data";
import { isCertificationDay } from "@/lib/progress";

type Params = Promise<{ b: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { b } = await params;
  return { title: `Bloque ${b} · Study Tracker` };
}

export default async function BloquePage({ params }: { params: Params }) {
  const { b } = await params;
  if (!/^\d{1,3}$/.test(b)) notFound();
  const route = await loadRoute();
  const stats = route.blocks.find((s) => s.block.id === Number(b));
  if (!stats) notFound();
  const { block, done, total, pct, state } = stats;
  const days = route.sessions.filter((s) => s.blockId === block.id);

  return (
    <main>
      <header>
        <div className="-ml-2 flex items-center gap-1">
          <Link href="/ruta" aria-label="Volver a Ruta" className="flex size-11 items-center justify-center rounded-lg hover:bg-stone-100">
            <BackIcon />
          </Link>
          <span className="text-sm font-medium text-stone-600">Bloque {block.id}</span>
          <span className="ml-auto">
            <BlockBadge state={state} />
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-snug">{block.title}</h1>
        <p className="mt-1 text-[15px] text-stone-600">{block.goal}</p>
        {block.certification ? (
          <p className="mt-1 text-sm text-stone-600">
            Certificación: {block.certification} · día {block.certificationDay}
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={pct} label={`Progreso del bloque ${block.id}`} />
          <span className="shrink-0 text-sm tabular-nums text-stone-600">
            {done}/{total}
          </span>
        </div>
      </header>

      <ol className="mt-6 space-y-1">
        {days.map((s) => {
          const status = route.statusOf(s.id);
          const isCurrent = status === "current";
          return (
            <li key={s.id}>
              <Link
                href={`/sesion/${s.blockId}/${s.day}`}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  isCurrent
                    ? "border-accent/50 bg-accent-soft"
                    : status === "future"
                      ? "border-transparent opacity-70 hover:bg-stone-100"
                      : "border-transparent hover:bg-stone-100"
                }`}
              >
                {status === "done" ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <CheckIcon />
                  </span>
                ) : (
                  <span
                    className={`size-6 shrink-0 rounded-full border-2 ${isCurrent ? "border-accent" : "border-stone-300"}`}
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1 text-[15px] leading-snug">
                  <span className="tabular-nums text-stone-600">
                    Día {s.day} · {s.hours}h ·{" "}
                  </span>
                  <span className={isCurrent ? "font-semibold" : ""}>{s.title}</span>
                  <span className="sr-only">
                    {status === "done" ? " (hecha)" : isCurrent ? " (día actual)" : " (pendiente)"}
                  </span>
                </span>
                {isCertificationDay(s, block) ? <Chip>Certificación</Chip> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
