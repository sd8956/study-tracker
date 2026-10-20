"use client";

import { useState, useTransition } from "react";
import { clearChatAction } from "@/app/(app)/actions";
import { Markdown } from "@/components/markdown";
import { MicButton } from "@/components/mic-button";
import { buttonSecondary } from "@/components/ui";
import { postJson } from "@/lib/client-api";

type Msg = { role: "user" | "assistant"; content: string };
const HISTORY = 20;

export function TutorChat({ sessionKey, initial }: { sessionKey: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearing, startClear] = useTransition();

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    // Send a bounded history that starts with a user turn.
    let history = next.slice(-HISTORY);
    while (history.length && history[0].role !== "user") history = history.slice(1);
    const r = await postJson<{ reply: string }>("/api/tutor/chat", { sessionKey, messages: history });
    setBusy(false);
    if (r.ok) setMessages((m) => [...m, { role: "assistant", content: r.data.reply }]);
    else {
      setError(r.error);
      setMessages(messages);
      setInput(text);
    }
  }

  function clear() {
    startClear(async () => {
      const r = await clearChatAction(sessionKey);
      if (r.ok) setMessages([]);
      else setError(r.error);
    });
  }

  return (
    <div className="space-y-3">
      {messages.length ? (
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 ${m.role === "user" ? "ml-8 bg-accent-soft" : "mr-4 border border-stone-200 bg-white"}`}
            >
              <p className="text-xs font-semibold text-stone-500">{m.role === "user" ? "Tú" : "Tutor"}</p>
              {m.role === "assistant" ? (
                <Markdown className="mt-1 text-[15px]">{m.content}</Markdown>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-[15px]">{m.content}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-stone-600">Pregúntale al tutor lo que no te quedó claro de esta sesión.</p>
      )}
      {busy ? (
        <p role="status" className="text-sm text-stone-600">
          El tutor está escribiendo…
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="chat-input" className="sr-only">
          Mensaje para el tutor
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          rows={3}
          placeholder="Escribe tu pregunta…"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] placeholder:text-stone-400"
        />
        <div className="flex flex-wrap items-start gap-2">
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            Enviar
          </button>
          <MicButton disabled={busy} onText={(t) => setInput((v) => (v.trim() ? `${v.trim()} ${t}` : t))} />
          {messages.length ? (
            <button type="button" onClick={clear} disabled={clearing || busy} className={buttonSecondary}>
              Borrar chat
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
