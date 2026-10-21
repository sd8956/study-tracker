"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importBackupAction } from "@/app/(app)/actions";
import { buttonSecondary } from "@/components/ui";

export function ImportBackup() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!window.confirm("Importar reemplaza todo tu progreso actual por el de la copia. ¿Continuar?")) return;
    const data = new FormData(e.currentTarget);
    start(async () => {
      const r = await importBackupAction(data);
      setMessage(r.ok ? { ok: true, text: "Copia importada." } : { ok: false, text: r.error });
      if (r.ok) {
        form.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="mt-4 space-y-2">
      <label htmlFor="backup-file" className="block text-[15px] font-medium">
        Importar copia
      </label>
      <input
        id="backup-file"
        name="file"
        type="file"
        accept="application/json,.json"
        required
        className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:border-stone-300 file:bg-white file:px-3 file:text-sm file:font-medium"
      />
      <button type="submit" disabled={pending} className={buttonSecondary}>
        {pending ? "Importando…" : "Importar"}
      </button>
      {message ? (
        <p role="status" className={`text-sm ${message.ok ? "text-accent-strong" : "text-red-700"}`}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
