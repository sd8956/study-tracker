import Link from "next/link";
import type { Metadata } from "next";
import { ProgressBar } from "@/components/ui";
import { loadAppState } from "@/lib/data";
import { PHASES } from "@/lib/plan";
import { groupState } from "@/lib/progress";
import { sessionHref } from "@/lib/routes";
import { shortDate } from "@/lib/schedule";
import { computeStreak, heatmapWeeks } from "@/lib/stats";
import { evaluationScores, getEnglishLog, listCards } from "@/lib/store";

export const metadata: Metadata = { title: "Progreso · Study Tracker" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

const HEAT = ["bg-stone-100", "bg-teal-200", "bg-teal-400", "bg-teal-600"];

export default async function ProgresoPage() {
  const { plan, progress, completedDates, db, today } = await loadAppState();
  const english = getEnglishLog(db);

  const activity = new Map<string, number>();
  const bump = (d: string) => activity.set(d, (activity.get(d) ?? 0) + 1);
  for (const [key, date] of completedDates) if (plan.byKey.has(key)) bump(date);
  for (const date of english.keys()) bump(date);

  const streak = computeStreak(new Set(activity.keys()), today);
  const hoursDone = plan.sessions.filter((s) => completedDates.has(s.key)).reduce((n, s) => n + s.hours, 0);
  const hoursTotal = plan.sessions.reduce((n, s) => n + s.hours, 0);
  const englishMinutes = [...english.values()].reduce((a, b) => a + b, 0);
  const scores = evaluationScores(db);
  const evaluations = plan.sessions.filter((s) => s.kind === "evaluation");
  const boxes = [1, 2, 3, 4, 5].map((b) => ({ box: b, n: 0 }));
  for (const c of listCards(db)) boxes[c.box - 1].n++;
  const weeks = heatmapWeeks(activity, today);

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold">Progreso</h1>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3">
        <Stat label="Racha" value={`${streak} ${streak === 1 ? "día" : "días"}`} hint="Lun–sáb; el domingo no la rompe" />
        <Stat label="Días de inglés" value={english.size} hint={`${Math.round(englishMinutes / 60)} h en total`} />
        <Stat label="Sesiones" value={`${progress.done}/${progress.total}`} hint={`${progress.pct}% de la ruta`} />
        <Stat label="Horas de ruta" value={`${hoursDone} h`} hint={`de ${hoursTotal} h`} />
      </section>

      <section aria-labelledby="actividad">
        <h2 id="actividad" className="text-lg font-semibold">
          Últimas 12 semanas
        </h2>
        <div className="mt-3 flex gap-1" role="img" aria-label="Mapa de actividad: sesiones e inglés por día">
          <div className="grid grid-rows-7 gap-1 pr-1 text-[10px] leading-none text-stone-500">
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <span key={d} className="flex size-4 items-center">
                {d}
              </span>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0].date} className="grid grid-rows-7 gap-1">
              {week.map((cell) => (
                <span
                  key={cell.date}
                  title={`${shortDate(cell.date)}: ${cell.count}`}
                  className={`size-4 rounded-sm sm:size-5 ${cell.future ? "bg-transparent" : HEAT[Math.min(cell.count, 3)]} ${
                    cell.date === today ? "ring-2 ring-accent ring-offset-1" : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">Cada día suma 1 por la sesión técnica y 1 por el inglés.</p>
      </section>

      <section aria-labelledby="fases">
        <h2 id="fases" className="text-lg font-semibold">
          Por fase
        </h2>
        <ul className="mt-3 space-y-3">
          {PHASES.map((phase) => {
            const keys = plan.sessions.filter((s) => plan.moduleById.get(s.moduleId)?.phase === phase.id).map((s) => s.key);
            if (keys.length === 0) return null;
            const g = groupState(keys, progress);
            return (
              <li key={phase.id}>
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span>{phase.title}</span>
                  <span className="tabular-nums text-stone-600">
                    {g.done}/{g.total} · {g.pct}%
                  </span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={g.pct} label={`Progreso de ${phase.title}`} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="evaluaciones">
        <h2 id="evaluaciones" className="text-lg font-semibold">
          Evaluaciones
        </h2>
        {evaluations.length === 0 ? (
          <p className="mt-2 text-[15px] text-stone-600">Todavía no hay evaluaciones en la ruta.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {evaluations.map((s) => {
              const sc = scores.get(s.key);
              return (
                <li key={s.key}>
                  <Link href={sessionHref(s.key)} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] hover:bg-stone-50">
                    <span className="min-w-0 truncate">{s.title}</span>
                    <span
                      className={`shrink-0 tabular-nums ${sc ? (sc.pct >= 70 ? "font-semibold text-accent-strong" : "font-semibold text-amber-700") : "text-stone-500"}`}
                    >
                      {sc ? `${sc.pct} %` : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="cajas">
        <h2 id="cajas" className="text-lg font-semibold">
          Tarjetas por caja
        </h2>
        <ul className="mt-3 grid grid-cols-5 gap-2 text-center">
          {boxes.map((b) => (
            <li key={b.box} className="rounded-xl border border-stone-200 bg-white px-1 py-3">
              <p className="text-xl font-semibold tabular-nums">{b.n}</p>
              <p className="text-xs text-stone-600">Caja {b.box}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">Caja 1 vuelve al día siguiente; caja 5, a los 60 días.</p>
      </section>
    </main>
  );
}
