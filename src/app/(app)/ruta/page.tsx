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
      <p className="mt-1 text-[15px] text-stone-600">Una sesión por día de estudio: lunes a viernes 2 h, sábado 3 h, domingo descanso.</p>

      {PHASES.map((phase) => {
        const modules = plan.modules.filter((m) => m.phase === phase.id);
        if (modules.length === 0) return null;
        const keys = modules.flatMap((m) => m.sessions.map((s) => s.key));
        const ps = groupState(keys, progress);
        return (
          <section key={phase.id} aria-labelledby={`fase-${phase.id}`} className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`fase-${phase.id}`} className="text-lg font-semibold">
                {phase.title}
              </h2>
              <span className="text-sm tabular-nums text-stone-600">
                {ps.done}/{ps.total}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar value={ps.pct} label={`Progreso de ${phase.title}`} />
            </div>

            <ul className="mt-4 space-y-3">
              {modules.map((m) => {
                const ms = groupState(
                  m.sessions.map((s) => s.key),
                  progress,
                );
                return (
                  <li key={m.id} id={m.id} className="scroll-mt-4">
                    <details open={m.id === currentModule} className="group rounded-xl border border-stone-200 bg-white">
                      <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
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
        );
      })}
    </main>
  );
}
