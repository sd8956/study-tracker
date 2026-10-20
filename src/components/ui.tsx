import type { ReactNode } from "react";
import type { SessionKind } from "@/lib/content-format";
import type { BlockState } from "@/lib/progress";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  const cls =
    tone === "accent"
      ? "border-accent/30 bg-accent-soft text-accent-strong"
      : "border-stone-200 bg-stone-100 text-stone-700";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium ${cls}`}>{children}</span>;
}

const BADGE: Record<BlockState, { text: string; cls: string }> = {
  en_curso: { text: "En curso", cls: "border-accent/30 bg-accent-soft text-accent-strong" },
  hecho: { text: "Hecho", cls: "border-accent bg-accent text-white" },
  pendiente: { text: "Pendiente", cls: "border-stone-200 bg-stone-100 text-stone-700" },
};

export function BlockBadge({ state }: { state: BlockState }) {
  const b = BADGE[state];
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>{b.text}</span>;
}

export const KIND_LABEL: Record<SessionKind, string> = {
  lesson: "Lección",
  project: "Proyecto",
  evaluation: "Evaluación",
  course: "Curso",
  task: "Cloud",
};

export function KindBadge({ kind }: { kind: SessionKind }) {
  return <Chip tone={kind === "project" || kind === "evaluation" ? "accent" : "neutral"}>{KIND_LABEL[kind]}</Chip>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-stone-200 bg-white p-5 ${className}`}>{children}</section>;
}

export const buttonPrimary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-medium text-white hover:bg-accent-strong disabled:opacity-60";
export const buttonSecondary =
  "inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50 disabled:opacity-60";
