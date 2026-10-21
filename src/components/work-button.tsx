"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { logWorkAction } from "@/app/(app)/actions";

/** Records today's partial hours on a session that continues on a later day. */
export function WorkButton({ sessionKey, hours }: { sessionKey: string; hours: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await logWorkAction(sessionKey, hours);
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
        className="h-11 w-full rounded-xl border border-stone-300 bg-white text-[15px] font-medium hover:bg-stone-50 disabled:opacity-60"
      >
        {pending ? "Guardando…" : `Avancé ${hours} h hoy`}
      </button>
      {error ? (
        <p aria-live="polite" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
