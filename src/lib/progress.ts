// Estado derivado de la ruta (espejo en TS de las reglas que impone la DB).
// La DB es la autoridad; esto decide qué muestra la UI.

export type Link = { url: string; label: string };

export type Block = {
  id: number;
  title: string;
  goal: string;
  certification: string | null;
  certificationCode: string | null;
  certificationDay: number | null;
  totalDays: number;
};

export type Session = {
  id: number;
  position: number;
  blockId: number;
  day: number;
  hours: number;
  title: string;
  description: string;
  links: Link[];
};

export type SessionStatus = "done" | "current" | "future";
export type BlockState = "pendiente" | "en_curso" | "hecho";

export type BlockStats = {
  block: Block;
  done: number;
  total: number;
  pct: number;
  state: BlockState;
};

export type RouteState = {
  sessions: Session[]; // ordenadas por position
  total: number;
  done: number;
  pct: number;
  current: Session | null;
  next: Session | null; // la siguiente a current (solo preview)
  lastCompleted: Session | null;
  blocks: BlockStats[];
  statusOf: (sessionId: number) => SessionStatus;
  canComplete: (sessionId: number) => boolean;
  canUndo: (sessionId: number) => boolean;
};

/** Porcentaje redondeado que nunca muestra 100 % si falta algo (ni 0 % si hay algo). */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.round((done / total) * 100);
  if (done < total && p >= 100) return 99;
  if (done > 0 && p === 0) return 1;
  return p;
}

export function buildRoute(blocks: Block[], sessions: Session[], completedIds: Iterable<number>): RouteState {
  const ordered = [...sessions].sort((a, b) => a.position - b.position);
  const completed = new Set(completedIds);
  const validIds = new Set(ordered.map((s) => s.id));
  for (const id of completed) if (!validIds.has(id)) completed.delete(id);

  const current = ordered.find((s) => !completed.has(s.id)) ?? null;
  let lastCompleted: Session | null = null;
  for (const s of ordered) if (completed.has(s.id)) lastCompleted = s;

  const next = current ? (ordered.find((s) => s.position > current.position && !completed.has(s.id)) ?? null) : null;

  const statusOf = (id: number): SessionStatus => {
    if (completed.has(id)) return "done";
    if (current && current.id === id) return "current";
    return "future";
  };

  const blockStats: BlockStats[] = [...blocks]
    .sort((a, b) => a.id - b.id)
    .map((block) => {
      const own = ordered.filter((s) => s.blockId === block.id);
      const total = own.length;
      const done = own.filter((s) => completed.has(s.id)).length;
      const hasCurrent = current?.blockId === block.id;
      const state: BlockState = total > 0 && done === total ? "hecho" : done > 0 || hasCurrent ? "en_curso" : "pendiente";
      return { block, done, total, pct: percent(done, total), state };
    });

  const done = completed.size;
  return {
    sessions: ordered,
    total: ordered.length,
    done,
    pct: percent(done, ordered.length),
    current,
    next,
    lastCompleted,
    blocks: blockStats,
    statusOf,
    canComplete: (id) => current !== null && current.id === id,
    canUndo: (id) => lastCompleted !== null && lastCompleted.id === id,
  };
}

export function isCertificationDay(session: Pick<Session, "blockId" | "day">, block: Pick<Block, "id" | "certificationDay"> | undefined) {
  return !!block && block.id === session.blockId && block.certificationDay === session.day;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
