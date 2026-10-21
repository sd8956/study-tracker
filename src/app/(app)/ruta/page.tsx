import Link from "next/link";
import type { Metadata } from "next";
import { CheckIcon } from "@/components/icons";
import { BlockBadge, KIND_LABEL, ProgressBar } from "@/components/ui";
import { loadAppState } from "@/lib/data";
import { PHASES } from "@/lib/plan";
import { groupState } from "@/lib/progress";
import { sessionHref } from "@/lib/routes";
import { shortDate } from "@/lib/schedule";

export const metadata: Metadata = { title: "Ruta · Study Tracker" };

const PHASE_TITLE = new Map(PHASES.map((p) => [p.id, p.title]));

export default async function RutaPage() {
  const { plan, progress, schedule } = await loadAppState();
  const currentModule = progress.currentKey ? plan.byKey.get(progress.currentKey)?.moduleId : undefined;

  return (
    <main>
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Ruta</h1>
        <p className="text-[15px] font-medium tabular-nums">
          {progress.done} / {progress.total} · {progress.pct}%
        </p>
      </header>
      <p className="mt-1 text-[15px] text-stone-600">
        Por horas: lunes a viernes 2 h, sábado 3 h, domingo descanso. Una sesión de 3 h puede ocupar dos días.
      </p>

      <section aria-labelledby="fases" className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <h2 id="fases" className="text-[17px] font-semibold">
          Fases
        </h2>
        <ul className="mt-3 space-y-3">
          {PHASES.map((phase) => {
            const keys = plan.modules.filter((m) => m.phase === phase.id).flatMap((m) => m.sessions.map((s) => s.key));
            if (keys.length === 0) return null;
            const ps = groupState(keys, progress);
            return (
              <li key={phase.id}>
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="font-medium">{phase.title}</span>
                  <span className="text-sm tabular-nums text-stone-600">
                    {ps.done}/{ps.total}
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={ps.pct} label={`Progreso de ${phase.title}`} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

          <section aria-labelledby="modulos" className="mt-8">
            <h2 id="modulos" className="text-lg font-semibold">
              Módulos en orden
            </h2>

            <ul className="mt-4 space-y-3">
              {plan.modules.map((m) => {
                const ms = groupState(
                  m.sessions.map((s) => s.key),
                  progress,
                );
                return (
                  <li key={m.id} id={m.id} className="scroll-mt-4">
                    <details open={m.id === currentModule} className="group rounded-xl border border-stone-200 bg-white">
                      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
                        <p className="text-sm text-stone-600">{PHASE_TITLE.get(m.phase)}</p>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[17px] font-semibold leading-snug">{m.title}</h3>
                          <BlockBadge state={ms.state} />
                        </div>
                        {m.summary ? <p className="mt-1 line-clamp-2 text-sm text-stone-600">{m.summary}</p> : null}
                        {m.block?.certificationCode ? (
                          <p className="mt-0.5 text-sm text-stone-600">
                            Certificación {m.block.certificationCode} · día {m.block.certificationDay}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center gap-3">
                          <ProgressBar value={ms.pct} label={`Progreso de ${m.title}`} />
                          <span className="shrink-0 text-sm tabular-nums text-stone-600">
                            {ms.done}/{ms.total}
                          </span>
                        </div>
                      </summary>
                      <ol className="space-y-1 px-2 pb-3">
                        {m.sessions.map((s) => {
                          const status = progress.statusOf(s.key);
                          const planned = schedule.get(s.key);
                          const isCurrent = status === "current";
                          return (
                            <li key={s.key}>
                              <Link
                                href={sessionHref(s.key)}
                                aria-current={isCurrent ? "step" : undefined}
                                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 ${
                                  isCurrent
                                    ? "border-accent/50 bg-accent-soft"
                                    : status === "future"
                                      ? "border-transparent opacity-80 hover:bg-stone-100"
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
                                  <span className={isCurrent ? "font-semibold" : ""}>{s.title}</span>
                                  <span className="block text-sm text-stone-600">
                                    {KIND_LABEL[s.kind]} · {s.hours} h
                                    {planned ? ` · ${status === "done" ? "hecha " : ""}${shortDate(planned.date)}` : ""}
                                  </span>
                                  <span className="sr-only">
                                    {status === "done" ? " (hecha)" : isCurrent ? " (sesión actual)" : " (pendiente)"}
                                  </span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
    </main>
  );
}
