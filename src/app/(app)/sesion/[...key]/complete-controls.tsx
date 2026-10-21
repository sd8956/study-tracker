"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { completeSessionAction, undoSessionAction } from "@/app/(app)/actions";

export type ControlMode = "current" | "done-last" | "done-locked" | "future";

const HELP: Record<ControlMode, string> = {
  current: "Al marcarla pasas a la siguiente sesión.",
  "done-last": "Deshaz solo si fue un error.",
  "done-locked": "Solo puedes deshacer la última sesión completada.",
  future: "Completa la sesión actual primero.",
};

export function CompleteControls({ sessionKey, mode }: { sessionKey: string; mode: ControlMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (key: string) => Promise<{ ok: true } | { ok: false; error: string }>, then?: () => void) {
    start(async () => {
      setError(null);
      const r = await action(sessionKey);
      if (!r.ok) setError(r.error);
      else then?.();
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-md px-4 py-3">
        {mode === "current" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(completeSessionAction, () => router.push("/"))}
            className="h-12 w-full rounded-xl bg-accent text-base font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Marcar sesión hecha"}
          </button>
        ) : mode === "done-last" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(undoSessionAction, () => router.refresh())}
            className="h-12 w-full rounded-xl border border-stone-300 bg-white text-base font-medium hover:bg-stone-50 disabled:opacity-60"
          >
            {pending ? "Deshaciendo…" : "Deshacer"}
          </button>
        ) : null}
        <p aria-live="polite" className={`mt-1.5 text-sm ${error ? "text-red-700" : "text-stone-600"}`}>
          {error ?? HELP[mode]}
        </p>
      </div>
    </div>
  );
}
