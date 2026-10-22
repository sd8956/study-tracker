import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackIcon, ExternalIcon } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { Chip, KindBadge } from "@/components/ui";
import { loadAppState } from "@/lib/data";
import { certificationSession, dayNumber, getPlan } from "@/lib/plan";
import { sessionHref } from "@/lib/routes";
import { domainOf, isSafeExternalUrl } from "@/lib/progress";
import { longDate } from "@/lib/schedule";
import { evaluationScores, getChat, getNote } from "@/lib/store";
import { CompleteControls, type ControlMode } from "./complete-controls";
import { EvaluationRunner } from "./evaluation-runner";
import { FeynmanBox } from "./feynman-box";
import { ReviewQuestions } from "./review-questions";
import { TutorChat } from "./tutor-chat";

type Params = Promise<{ key: string[] }>;

const toKey = (parts: string[]) => parts.map((p) => decodeURIComponent(p)).join("/");

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  const session = getPlan().byKey.get(toKey(key));
  return { title: `${session?.title ?? "Sesión"} · Study Tracker` };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function SesionPage({ params }: { params: Params }) {
  const { key: parts } = await params;
  const state = await loadAppState();
  const { plan, progress, schedule, db, tutorEnabled } = state;
  const key = toKey(parts);
  const session = plan.byKey.get(key);
  if (!session) notFound();

  const mod = plan.moduleById.get(session.moduleId);
  const status = progress.statusOf(key);
  const planned = schedule.get(key);
  const mode: ControlMode =
    status === "current" ? "current" : status === "future" ? "future" : progress.canUndo(key) ? "done-last" : "done-locked";
  const current = progress.currentKey ? plan.byKey.get(progress.currentKey) : undefined;
  const links = session.links.filter((l) => isSafeExternalUrl(l.url));
  const s = session.sections;
  const lastEval = session.kind === "evaluation" ? (evaluationScores(db).get(key)?.pct ?? null) : null;

  return (
    <main>
      <header className="-ml-2 flex items-center gap-1">
        <Link
          href={`/ruta#${session.moduleId}`}
          aria-label="Volver a la ruta"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-stone-100"
        >
          <BackIcon />
        </Link>
        <p className="truncate text-sm font-medium text-stone-600">{mod?.title}</p>
      </header>

      <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{session.title}</h1>

      <div className="mt-3 flex flex-wrap gap-2">
        <KindBadge kind={session.kind} />
        <Chip>{session.hours} h</Chip>
        <Chip>Día {dayNumber(session)}</Chip>
        {status === "done" ? <Chip tone="accent">Hecha · {planned ? longDate(planned.date) : ""}</Chip> : null}
        {status === "current" ? <Chip tone="accent">Actual</Chip> : null}
        {mod?.block && certificationSession(plan, mod)?.key === session.key ? (
          <Chip>Certificación {mod.block.certificationCode}</Chip>
        ) : null}
      </div>

      {status === "future" && current ? (
        <div role="note" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
          <p className="font-medium">Completa la sesión actual primero.</p>
          <Link href={sessionHref(current.key)} className="mt-1 inline-block underline underline-offset-4">
            Ir a {current.title}
          </Link>
        </div>
      ) : null}

      {s.objetivo ? (
        <Section id="objetivo" title="Objetivo">
          <Markdown>{s.objetivo}</Markdown>
        </Section>
      ) : null}
      {s.description ? <p className="mt-5 text-[17px] leading-relaxed">{s.description}</p> : null}
      {s.estudio ? (
        <Section id="estudio" title="Estudio">
          <Markdown>{s.estudio}</Markdown>
        </Section>
      ) : null}
      {s.queHacer ? (
        <Section id="que-hacer" title="Qué hacer">
          <Markdown>{s.queHacer}</Markdown>
        </Section>
      ) : null}
      {s.conceptos ? (
        <Section id="conceptos" title="Conceptos clave">
          <Markdown>{s.conceptos}</Markdown>
        </Section>
      ) : null}
      {s.ejercicio ? (
        <Section id="ejercicio" title="Ejercicio">
          <Markdown>{s.ejercicio}</Markdown>
        </Section>
      ) : null}

      {links.length > 0 ? (
        <Section id="material" title="Material">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-300"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{link.label}</span>
                    <span className="block truncate text-sm text-stone-600">Abre en {domainOf(link.url)}</span>
                  </span>
                  <ExternalIcon className="size-5 shrink-0 text-stone-500" />
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {session.sources.length > 0 ? (
        <Section id="fuentes" title="Fuentes">
          <ul className="list-disc space-y-1 pl-5 text-[15px] text-stone-700">
            {session.sources.map((src) => (
              <li key={src}>{src}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {session.review.length > 0 ? (
        <Section id="repaso" title="Preguntas de repaso">
          <p className="mb-3 text-sm text-stone-600">Responde sin mirar y luego compara. Al marcar la sesión entran a tu mazo de repaso.</p>
          <ReviewQuestions sessionKey={key} questions={session.review} tutorEnabled={tutorEnabled} />
        </Section>
      ) : null}

      {session.evaluation.length > 0 ? (
        <Section id="evaluacion" title="Evaluación">
          <EvaluationRunner sessionKey={key} questions={session.evaluation} tutorEnabled={tutorEnabled} lastPct={lastEval} />
        </Section>
      ) : null}

      {s.feynman ? (
        <Section id="feynman" title="Explícalo con tus palabras">
          <Markdown className="mb-3">{s.feynman}</Markdown>
          <FeynmanBox sessionKey={key} initial={getNote(db, key)} tutorEnabled={tutorEnabled} />
        </Section>
      ) : null}

      <Section id="tutor" title="Tutor">
        {tutorEnabled ? (
          <TutorChat sessionKey={key} initial={getChat(db, key)} />
        ) : (
          <p className="text-[15px] text-stone-600">
            El tutor no está configurado. Añade <code>NAN_API_KEY</code> a <code>.env.local</code> y reinicia la app. Mientras tanto,
            te autoevalúas con las respuestas modelo.
          </p>
        )}
      </Section>

      <CompleteControls key={`${key}-${mode}`} sessionKey={key} mode={mode} />
    </main>
  );
}
