import Link from "next/link";
import type { Metadata } from "next";
import { EnglishTimer } from "@/components/english-timer";
import { WorkButton } from "@/components/work-button";
import { CheckIcon } from "@/components/icons";
import { Chip, KindBadge, ProgressBar, buttonPrimary } from "@/components/ui";
import { loadAppState } from "@/lib/data";
import { dayNumber, type PlanSession } from "@/lib/plan";
import { sessionHref } from "@/lib/routes";
import { dayBudget, longDate, weekday } from "@/lib/schedule";
import { countDueCards, getEnglishLog } from "@/lib/store";

export const metadata: Metadata = { title: "Hoy · Study Tracker" };

export default async function HoyPage() {
  const state = await loadAppState();
  const { plan, progress, schedule, today, db } = state;

  if (weekday(today) === 0) {
    const next = progress.currentKey ? plan.byKey.get(progress.currentKey) : undefined;
    return (
      <main className="space-y-6">
        <Header state={state} />
        <section aria-labelledby="descanso" className="rounded-xl border border-stone-200 bg-white p-5">
          <h1 id="descanso" className="text-xl font-semibold">
            Hoy descansas.
          </h1>
          <p className="mt-1 text-[15px] text-stone-600">Domingo sin inglés ni ruta. Mañana sigues donde quedaste.</p>
          {next ? (
            <Link href={sessionHref(next.key)} className="mt-4 inline-block text-[15px] font-medium text-accent-strong underline underline-offset-4">
              Ver la sesión de mañana: {next.title}
            </Link>
          ) : null}
        </section>
      </main>
    );
  }

  const english = getEnglishLog(db).get(today) ?? null;
  const due = countDueCards(db, today);
  const doneToday = plan.sessions.filter((s) => state.completedDates.get(s.key) === today);
  // Pending sessions with hours planned today (hour budget: a session may span days).
  const plannedToday = plan.sessions
    .map((s) => ({ session: s, planned: schedule.get(s.key) }))
    .filter(({ planned }) => planned && planned.status !== "done" && planned.segments.some((g) => g.date === today))
    .map(({ session, planned }) => {
      const segments = planned!.segments;
      const todayHours = segments.find((g) => g.date === today)!.hours;
      const later = segments.filter((g) => g.date > today);
      return { session, todayHours, continuesOn: later[0]?.date ?? null, current: planned!.status === "current" };
    });
  const current = progress.currentKey ? plan.byKey.get(progress.currentKey) : undefined;
  const budget = dayBudget(today);

  return (
    <main className="space-y-5">
      <Header state={state} />
      <h1 className="sr-only">Hoy</h1>

      <EnglishTimer today={today} doneMinutes={english} />

      <section aria-labelledby="repaso-title" className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="repaso-title" className="text-[17px] font-semibold">
            2. Repaso
          </h2>
          <span className="text-sm text-stone-600">≈ 15 min</span>
        </div>
        {due > 0 ? (
          <>
            <p className="mt-1 text-[15px] text-stone-600">
              {due === 1 ? "1 tarjeta pendiente" : `${due} tarjetas pendientes`} (máximo 15 por día).
            </p>
            <Link href="/repaso" className={`${buttonPrimary} mt-4 w-full`}>
              Repasar
            </Link>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-stone-600">Nada pendiente hoy. Las preguntas de cada lección entran al mazo al marcarla.</p>
        )}
      </section>

      <section aria-labelledby="sesion-title" className="space-y-2">
        <h2 id="sesion-title" className="px-1 text-[17px] font-semibold">
          3. Sesión técnica de hoy <span className="font-normal text-stone-600">· {budget} h</span>
        </h2>
        {doneToday.map((s) => (
          <SessionCard key={s.key} session={s} moduleTitle={plan.moduleById.get(s.moduleId)?.title ?? ""} done />
        ))}
        {plannedToday.map(({ session, todayHours, continuesOn, current: isCurrent }) => (
          <SessionCard
            key={session.key}
            session={session}
            moduleTitle={plan.moduleById.get(session.moduleId)?.title ?? ""}
            todayHours={todayHours}
            continuesOn={continuesOn}
            canLogWork={isCurrent && continuesOn !== null}
          />
        ))}
        {current && plannedToday.length === 0 ? (
          <p className="px-1 text-sm text-stone-600">
            Por hoy terminaste. Siguiente: Día {dayNumber(current)} · {current.title}
          </p>
        ) : null}
        {!current && plan.sessions.length > 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xl font-semibold">Ruta completa.</p>
            <p className="mt-1 text-[15px] text-stone-600">{progress.done} sesiones hechas.</p>
          </div>
        ) : null}
        {plan.sessions.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-xl font-semibold">Sin sesiones.</p>
            <p className="mt-1 text-[15px] text-stone-600">No hay contenido en content/. Revisa docs/CONTENT-FORMAT.md.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Header({ state }: { state: Awaited<ReturnType<typeof loadAppState>> }) {
  const { progress, today } = state;
  return (
    <header className="space-y-2">
      <p className="flex items-baseline justify-between gap-3 text-[15px]">
        <span className="capitalize text-stone-600">{longDate(today)}</span>
        <span className="font-medium tabular-nums">
          {progress.done} / {progress.total} · {progress.pct}%
        </span>
      </p>
      <ProgressBar value={progress.pct} label="Progreso de la ruta" />
    </header>
  );
}

function SessionCard({
  session,
  moduleTitle,
  done = false,
  todayHours,
  continuesOn = null,
  canLogWork = false,
}: {
  session: PlanSession;
  moduleTitle: string;
  done?: boolean;
  todayHours?: number;
  continuesOn?: string | null;
  canLogWork?: boolean;
}) {
  const objective = session.sections.objetivo ?? session.sections.description ?? "";
  return (
    <article className={`rounded-xl border p-5 ${done ? "border-accent/30 bg-accent-soft" : "border-stone-200 bg-white"}`}>
      <p className="text-sm text-stone-600">{moduleTitle}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <KindBadge kind={session.kind} />
        <Chip>Día {dayNumber(session)}</Chip>
        <Chip>{todayHours !== undefined && todayHours !== session.hours ? `hoy ${todayHours} h de ${session.hours} h` : `${session.hours} h`}</Chip>
        {done ? (
          <Chip tone="accent">
            <CheckIcon className="mr-1 size-3.5" /> Hecha
          </Chip>
        ) : null}
      </div>
      <h3 className="mt-3 text-xl font-semibold leading-snug">{session.title}</h3>
      {objective ? <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-stone-600">{objective}</p> : null}
      {continuesOn ? <p className="mt-2 text-sm text-stone-600">Continúa en tu próximo día de estudio.</p> : null}
      <Link
        href={sessionHref(session.key)}
        className={
          done
            ? "mt-4 inline-block text-[15px] font-medium text-accent-strong underline underline-offset-4"
            : `${buttonPrimary} mt-5 w-full`
        }
      >
        {done ? "Ver sesión" : "Abrir sesión"}
      </Link>
      {canLogWork && todayHours ? <WorkButton sessionKey={session.key} hours={todayHours} /> : null}
    </article>
  );
}
