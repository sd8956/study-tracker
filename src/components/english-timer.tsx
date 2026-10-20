"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { logEnglishAction } from "@/app/(app)/actions";
import { CheckIcon } from "./icons";

const DURATION_MS = 60 * 60 * 1000;
const STORAGE_KEY = "study-tracker:english-timer";

type Saved = { date: string; endAt: number | null; remaining: number };

function readSaved(today: string): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (s.date !== today || typeof s.remaining !== "number") return null;
    return s;
  } catch {
    return null;
  }
}

function writeSaved(s: Saved | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the timer still works until reload.
  }
}

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** A few rising tones, three times, with the Web Audio API (no audio file). */
function playChime(ctx: AudioContext | null) {
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  const tones = [660, 880, 1175];
  const start = ctx.currentTime + 0.05;
  for (let rep = 0; rep < 3; rep++) {
    tones.forEach((freq, i) => {
      const t = start + rep * 1.2 + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
}

function notify() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Se acabó la hora de inglés", { body: "Marca el inglés de hoy como hecho y sigue con la ruta." });
    }
  } catch {
    // Notifications are optional.
  }
}

export function EnglishTimer({ today, doneMinutes }: { today: string; doneMinutes: number | null }) {
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const audio = useRef<AudioContext | null>(null);

  const finish = useCallback(() => {
    setEndAt(null);
    setRemaining(0);
    setFinished(true);
    writeSaved({ date: today, endAt: null, remaining: 0 });
    playChime(audio.current);
    notify();
  }, [today]);

  // Restore a running or paused timer after a reload.
  useEffect(() => {
    const saved = readSaved(today);
    if (!saved) return;
    const left = saved.endAt !== null ? saved.endAt - Date.now() : saved.remaining;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from localStorage after hydration */
    if (left <= 0) {
      setRemaining(0);
      setFinished(true);
    } else {
      setRemaining(left);
      setEndAt(saved.endAt);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [today]);

  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const left = endAt - Date.now();
      if (left <= 0) finish();
      else setRemaining(left);
    }, 250);
    return () => clearInterval(id);
  }, [endAt, finish]);

  function ensureAudio() {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!audio.current && Ctx) audio.current = new Ctx();
      void audio.current?.resume().catch(() => undefined);
    } catch {
      audio.current = null;
    }
  }

  function start() {
    ensureAudio();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
    } catch {
      // ignore
    }
    const end = Date.now() + remaining;
    setEndAt(end);
    setFinished(false);
    writeSaved({ date: today, endAt: end, remaining });
  }

  function pause() {
    const left = endAt !== null ? Math.max(0, endAt - Date.now()) : remaining;
    setEndAt(null);
    setRemaining(left);
    writeSaved({ date: today, endAt: null, remaining: left });
  }

  function reset() {
    setEndAt(null);
    setRemaining(DURATION_MS);
    setFinished(false);
    writeSaved(null);
  }

  function markDone() {
    const elapsedMin = Math.round((DURATION_MS - remaining) / 60000);
    if (!finished && !window.confirm("El temporizador no ha terminado. ¿Marcar el inglés de hoy como hecho igual?")) return;
    const minutes = finished ? 60 : elapsedMin > 0 ? elapsedMin : 60;
    startTransition(async () => {
      setError(null);
      const r = await logEnglishAction(minutes);
      if (!r.ok) setError(r.error);
      else {
        setEndAt(null);
        writeSaved(null);
      }
    });
  }

  if (doneMinutes !== null) {
    return (
      <section aria-labelledby="ingles-title" className="rounded-xl border border-accent/30 bg-accent-soft p-5">
        <h2 id="ingles-title" className="flex items-center gap-2 text-[17px] font-semibold text-accent-strong">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon />
          </span>
          Inglés de hoy hecho
        </h2>
        <p className="mt-1 text-[15px] text-accent-strong">{doneMinutes} min. Sigue con la ruta.</p>
      </section>
    );
  }

  const running = endAt !== null;
  return (
    <section aria-labelledby="ingles-title" className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ingles-title" className="text-[17px] font-semibold">
          1. Inglés
        </h2>
        <span className="text-sm text-stone-600">1 h en tu plataforma</span>
      </div>
      <p
        className={`mt-3 text-center text-5xl font-semibold tabular-nums tracking-tight ${finished ? "text-accent" : ""}`}
        aria-live="off"
      >
        {format(remaining)}
      </p>
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-center text-sm text-stone-600">
        {finished ? "¡Se acabó la hora de inglés!" : running ? "Corriendo…" : remaining < DURATION_MS ? "En pausa" : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {running ? (
          <button type="button" onClick={pause} className="h-11 rounded-xl border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50">
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={finished}
            className="h-11 rounded-xl bg-accent text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {remaining < DURATION_MS ? "Reanudar" : "Empezar"}
          </button>
        )}
        <button type="button" onClick={reset} className="h-11 rounded-xl border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50">
          Reiniciar
        </button>
      </div>
      <button
        type="button"
        onClick={markDone}
        disabled={pending}
        className={`mt-2 h-12 w-full rounded-xl text-base font-medium disabled:opacity-60 ${
          finished ? "bg-accent text-white hover:bg-accent-strong" : "border border-stone-300 bg-white hover:bg-stone-50"
        }`}
      >
        {pending ? "Guardando…" : "Marcar inglés de hoy como hecho"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
