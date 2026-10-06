"use client";

import { useOptimistic, useState, useTransition } from "react";
import { completeSessionAction, undoSessionAction } from "@/app/(app)/actions";

export type ToggleMode = "current" | "done-last" | "done-locked" | "future";

const HELP: Record<ToggleMode, string> = {
  current: "Al marcarla pasas al siguiente día.",
  "done-last": "Desmarca solo si fue un error.",
  "done-locked": "Solo puedes desmarcar el último día completado.",
  future: "Completa el día actual primero.",
};

export function CompleteToggle({ sessionId, mode }: { sessionId: number; mode: ToggleMode }) {
  const serverChecked = mode === "done-last" || mode === "done-locked";
  const enabled = mode === "current" || mode === "done-last";
  const [checked, setOptimistic] = useOptimistic(serverChecked);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onChange = () => {
    if (!enabled || pending) return;
    start(async () => {
      setError(null);
      setMessage(null);
      setOptimistic(!serverChecked);
      const r = mode === "current" ? await completeSessionAction(sessionId) : await undoSessionAction(sessionId);
      if (!r.ok) setError(r.error);
      else if (r.message) setMessage(r.message);
    });
  };

  const id = `complete-${sessionId}`;
  const helpId = `${id}-help`;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-md px-4 py-3">
        <label
          htmlFor={id}
          className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 ${
            enabled ? "cursor-pointer border-stone-300 bg-white" : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-600"
          }`}
        >
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={!enabled || pending}
            onChange={onChange}
            aria-describedby={helpId}
            className="size-6 shrink-0 accent-[#0f766e] disabled:cursor-not-allowed"
          />
          <span className="text-base font-medium">{pending ? "Guardando…" : "Marcar como hecha"}</span>
        </label>
        <p id={helpId} aria-live="polite" className={`mt-1.5 text-sm ${error ? "text-red-700" : "text-stone-600"}`}>
          {error ?? message ?? HELP[mode]}
        </p>
      </div>
    </div>
  );
}
