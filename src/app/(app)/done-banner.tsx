"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoSessionAction } from "./actions";

export function DoneBanner({ sessionId, label, canUndo }: { sessionId: number; label: string; canUndo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
      <p className="text-[15px] text-accent-strong">
        <span className="font-medium">Hecho:</span> {label}
        {error ? <span className="mt-1 block text-sm text-red-700">{error}</span> : null}
      </p>
      {canUndo ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await undoSessionAction(sessionId);
              if (!r.ok) setError(r.error);
              else router.replace("/");
            })
          }
          className="h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-accent-strong underline underline-offset-4 disabled:opacity-60"
        >
          {pending ? "Deshaciendo…" : "Deshacer"}
        </button>
      ) : null}
    </div>
  );
}
