"use client";

import { useEffect, useRef, useState } from "react";
import { postForm } from "@/lib/client-api";
import { MicIcon } from "./icons";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
const MAX_SECONDS = 300;

/** Records from the microphone and returns the transcription (NaN Builders STT via /api/transcribe). */
export function MicButton({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite grabar audio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("No hay permiso para usar el micrófono.");
      return;
    }
    const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
      const blob = new Blob(chunks, { type: (rec.mimeType || mimeType || "audio/webm").split(";")[0] });
      if (blob.size === 0) {
        setState("idle");
        return;
      }
      setState("sending");
      const form = new FormData();
      form.append("file", blob, "respuesta");
      const r = await postForm<{ text: string }>("/api/transcribe", form);
      setState("idle");
      if (!r.ok) setError(r.error);
      else if (r.data.text) onText(r.data.text);
      else setError("No se entendió el audio. Inténtalo de nuevo.");
    };
    recorder.current = rec;
    rec.start();
    setState("recording");
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SECONDS * 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  const label = state === "recording" ? "Detener y transcribir" : state === "sending" ? "Transcribiendo…" : "Dictar respuesta";
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={disabled || state === "sending"}
        aria-pressed={state === "recording"}
        className={`inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium disabled:opacity-60 ${
          state === "recording" ? "border-red-300 bg-red-50 text-red-800" : "border-stone-300 bg-white hover:bg-stone-50"
        }`}
      >
        <MicIcon />
        {label}
      </button>
      {error ? (
        <span role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
