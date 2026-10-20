"use client";

import Link from "next/link";
import { useState } from "react";
import { reviewCardAction } from "@/app/(app)/actions";
import { GradeResult } from "@/components/grade-result";
import { Markdown } from "@/components/markdown";
import { MicButton } from "@/components/mic-button";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { gradeAnswer, type GradeResponse } from "@/lib/client-api";
import type { ReviewResult } from "@/lib/leitner";
import { sessionHref } from "@/lib/routes";

export type Flashcard = {
  cardKey: string;
  sessionKey: string;
  sessionTitle: string;
  index: number;
  question: string;
  answer: string;
  box: number;
};

const RESULTS: { result: ReviewResult; label: string; hint: string }[] = [
  { result: "good", label: "Bien", hint: "La sabía" },
  { result: "hard", label: "Dudé", hint: "Mañana otra vez" },
  { result: "again", label: "Mal", hint: "Vuelve a la caja 1" },
];

export function Flashcards({ cards, tutorEnabled }: { cards: Flashcard[]; tutorEnabled: boolean }) {
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = cards[pos];

  if (!card) {
    return (
      <section role="status" className="mt-6 rounded-xl border border-accent/30 bg-accent-soft p-5">
        <p className="text-[17px] font-semibold text-accent-strong">Repaso de hoy terminado.</p>
        <p className="mt-1 text-[15px] text-accent-strong">{cards.length} tarjetas repasadas.</p>
        <Link href="/" className={`${buttonPrimary} mt-4 w-full`}>
          Volver a Hoy
        </Link>
      </section>
    );
  }

  async function tutor() {
    setBusy(true);
    setError(null);
    const r = await gradeAnswer({ sessionKey: card.sessionKey, questionIndex: card.index, kind: "review", answer });
    setBusy(false);
    if (r.ok) {
      setGrade(r.data);
      setRevealed(true);
    } else setError(r.error);
  }

  async function rate(result: ReviewResult) {
    setBusy(true);
    setError(null);
    const r = await reviewCardAction(card.cardKey, result);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setPos((p) => p + 1);
    setAnswer("");
    setRevealed(false);
    setGrade(null);
  }

  return (
    <section aria-label="Tarjeta" className="mt-5 rounded-xl border border-stone-200 bg-white p-5">
      <p className="flex justify-between gap-3 text-sm text-stone-600">
        <span className="tabular-nums">
          {pos + 1} de {cards.length}
        </span>
        <span>Caja {card.box}</span>
      </p>
      <Link href={sessionHref(card.sessionKey)} className="mt-1 block truncate text-sm text-stone-600 underline-offset-4 hover:underline">
        {card.sessionTitle}
      </Link>
      <p className="mt-3 text-[17px] font-medium leading-snug">{card.question}</p>

      <div className="mt-3 space-y-2">
        <label htmlFor="card-answer" className="sr-only">
          Tu respuesta (opcional)
        </label>
        <textarea
          id="card-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="Respóndela en tu cabeza o escríbela (opcional)…"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] placeholder:text-stone-400"
        />
        <div className="flex flex-wrap gap-2">
          {tutorEnabled ? <MicButton onText={(t) => setAnswer((v) => (v.trim() ? `${v.trim()} ${t}` : t))} /> : null}
          {tutorEnabled ? (
            <button type="button" onClick={tutor} disabled={busy || !answer.trim()} className={buttonSecondary}>
              {busy && !revealed ? "Evaluando…" : "Evaluar con tutor"}
            </button>
          ) : null}
          {!revealed ? (
            <button type="button" onClick={() => setRevealed(true)} className={buttonSecondary}>
              Ver respuesta
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {grade ? (
        <div className="mt-3">
          <GradeResult grade={grade} />
        </div>
      ) : null}
      {revealed ? (
        <>
          <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3">
            <p className="text-sm font-semibold text-stone-600">Respuesta modelo</p>
            <Markdown className="mt-1 text-[15px]">{card.answer}</Markdown>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.result}
                type="button"
                disabled={busy}
                onClick={() => rate(r.result)}
                className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-stone-300 bg-white px-2 py-2 text-[15px] font-medium hover:bg-stone-50 disabled:opacity-60"
              >
                {r.label}
                <span className="text-xs font-normal text-stone-600">{r.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
