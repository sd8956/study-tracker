// Derived progress state over the plan (pure). The DB enforces the rules; this decides what the UI shows.

export type SessionStatus = "done" | "current" | "future";
export type BlockState = "pendiente" | "en_curso" | "hecho";

export type ProgressState = {
  total: number;
  done: number;
  pct: number;
  currentKey: string | null;
  lastCompletedKey: string | null;
  statusOf: (key: string) => SessionStatus;
  canComplete: (key: string) => boolean;
  canUndo: (key: string) => boolean;
};

/** Rounded percentage that never shows 100 % while something is missing (nor 0 % once something is done). */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.round((done / total) * 100);
  if (done < total && p >= 100) return 99;
  if (done > 0 && p === 0) return 1;
  return p;
}

/** `keys` in plan order; `completed` may hold keys no longer in the plan (ignored). */
export function buildProgress(keys: string[], completed: { has: (key: string) => boolean }): ProgressState {
  const currentKey = keys.find((k) => !completed.has(k)) ?? null;
  const lastCompletedKey = [...keys].reverse().find((k) => completed.has(k)) ?? null;
  const done = keys.filter((k) => completed.has(k)).length;
  return {
    total: keys.length,
    done,
    pct: percent(done, keys.length),
    currentKey,
    lastCompletedKey,
    statusOf: (k) => (completed.has(k) ? "done" : k === currentKey ? "current" : "future"),
    canComplete: (k) => k === currentKey,
    canUndo: (k) => k === lastCompletedKey,
  };
}

export function groupState(keys: string[], progress: ProgressState): { done: number; total: number; pct: number; state: BlockState } {
  const done = keys.filter((k) => progress.statusOf(k) === "done").length;
  const total = keys.length;
  const hasCurrent = progress.currentKey !== null && keys.includes(progress.currentKey);
  const state: BlockState = total > 0 && done === total ? "hecho" : done > 0 || hasCurrent ? "en_curso" : "pendiente";
  return { done, total, pct: percent(done, total), state };
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
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
