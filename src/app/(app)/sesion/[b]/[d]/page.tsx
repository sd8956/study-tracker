import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackIcon, ExternalIcon } from "@/components/icons";
import { Chip, hoursLabel } from "@/components/ui";
import { loadRoute } from "@/lib/data";
import { domainOf, isCertificationDay, isSafeExternalUrl } from "@/lib/progress";
import { CompleteToggle, type ToggleMode } from "./complete-toggle";

type Params = Promise<{ b: string; d: string }>;

function parseParams(b: string, d: string) {
  if (!/^\d{1,3}$/.test(b) || !/^\d{1,3}$/.test(d)) return null;
  return { blockId: Number(b), day: Number(d) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { b, d } = await params;
  return { title: `Bloque ${b} · Día ${d} · Study Tracker` };
}

export default async function SesionPage({ params }: { params: Params }) {
  const { b, d } = await params;
  const parsed = parseParams(b, d);
  if (!parsed) notFound();

  const route = await loadRoute();
  const session = route.sessions.find((s) => s.blockId === parsed.blockId && s.day === parsed.day);
  if (!session) notFound();

  const block = route.blockById.get(session.blockId);
  const status = route.statusOf(session.id);
  const mode: ToggleMode =
    status === "current" ? "current" : status === "future" ? "future" : route.canUndo(session.id) ? "done-last" : "done-locked";
  const links = session.links.filter((l) => isSafeExternalUrl(l.url));
  const current = route.current;

  return (
    <main>
      <header className="-ml-2 flex items-center gap-1">
        <Link
          href={`/ruta/${session.blockId}`}
          aria-label={`Volver a Bloque ${session.blockId}`}
          className="flex size-11 items-center justify-center rounded-lg hover:bg-stone-100"
        >
          <BackIcon />
        </Link>
        <p className="text-sm font-medium text-stone-600">
          Bloque {session.blockId} · Día {session.day}
          {block ? <span className="sr-only"> de {block.totalDays}</span> : null}
        </p>
      </header>

      <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{session.title}</h1>

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip tone={session.hours === 3 ? "accent" : "neutral"}>{hoursLabel(session.hours)}</Chip>
        {isCertificationDay(session, block) ? <Chip>Certificación {block?.certificationCode}</Chip> : null}
        {status === "done" ? <Chip tone="accent">Hecha</Chip> : null}
      </div>

      {status === "future" && current ? (
        <div role="note" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] text-amber-900">
          <p className="font-medium">Completa el día actual primero.</p>
          <Link href={`/sesion/${current.blockId}/${current.day}`} className="mt-1 inline-block underline underline-offset-4">
            Ir a Bloque {current.blockId} · Día {current.day}
          </Link>
        </div>
      ) : null}

      <p className="mt-5 text-[17px] leading-relaxed">{session.description}</p>

      {links.length > 0 ? (
        <section aria-labelledby="material" className="mt-8">
          <h2 id="material" className="text-sm font-semibold text-stone-600">
            Material
          </h2>
          <ul className="mt-2 space-y-2">
            {links.map((link) => {
              const domain = domainOf(link.url);
              return (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-300"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">{link.label}</span>
                      <span className="block truncate text-sm text-stone-600">Abre en {domain}</span>
                    </span>
                    <ExternalIcon className="size-5 shrink-0 text-stone-500" />
                    <span className="sr-only">(se abre en una pestaña nueva)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <CompleteToggle key={session.id} sessionId={session.id} mode={mode} />
    </main>
  );
}
