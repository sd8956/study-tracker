"use client";

import { useState } from "react";
import { ExternalIcon } from "@/components/icons";

export function AskGrok({ href, prompt }: { href: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    // Fallback in case Grok ignores ?q=: the prompt is also on the clipboard.
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-labelledby="tutor" className="mt-8">
      <h2 id="tutor" className="sr-only">
        Tutor
      </h2>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 hover:border-stone-300"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">Preguntar a Grok</span>
          <span className="block text-sm text-stone-600">Abre grok.com con el tema de esta sesión</span>
        </span>
        <ExternalIcon className="size-5 shrink-0 text-stone-500" />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-stone-600">
        {copied ? "Prompt copiado. Si Grok no lo muestra, pégalo." : ""}
      </p>
    </section>
  );
}
