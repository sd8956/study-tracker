"use client";

import { useState } from "react";
import { saveSelfGradeAction } from "@/app/(app)/actions";
import { GradeResult } from "@/components/grade-result";
import { Markdown } from "@/components/markdown";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { gradeAnswer, type GradeResponse } from "@/lib/client-api";
import { AnswerBox } from "./answer-box";

type Q = { index: number; question: string; answer: string };
const PASS_PCT = 70;

const SELF_GRADES = [
  { label: "Bien", score: 10 },
  { label: "A medias", score: 5 },
  { label: "Mal", score: 0 },
];

export function EvaluationRunner({
  sessionKey,
  questions,
  tutorEnabled,
  lastPct,
}: {
  sessionKey: string;
  questions: Q[];
  tutorEnabled: boolean;
  lastPct: number | null;
}) {
  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = questions[pos];
  const finished = started && pos >= questions.length;

  function next(score: number) {
    setScores((s) => ({ ...s, [q.index]: score }));
    setPos((p) => p + 1);
    setAnswer("");
    setRevealed(false);
    setGrade(null);
    setError(null);
  }

  async function tutorGrade() {
    setBusy(true);
    setError(null);
    const r = await gradeAnswer({ sessionKey, questionIndex: q.index, kind: "evaluation", answer });
    setBusy(false);
    if (r.ok) {
      setGrade(r.data);
      setRevealed(true);
    } else setError(r.error);
  }

  async function selfGrade(score: number) {
    setBusy(true);
    setError(null);
    const r = await saveSelfGradeAction({ sessionKey, kind: "evaluation", questionIndex: q.index, answer, score });
    setBusy(false);
    if (r.ok) next(score);
    else setError(r.error);
  }

  function restart() {
    setScores({});
    setPos(0);
    setAnswer("");
    setRevealed(false);
    setGrade(null);
    setStarted(true);
  }

  if (!started) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-[15px] text-stone-600">
          {questions.length} preguntas, una a la vez. Responde sin mirar el material.{" "}
          {tutorEnabled ? "El tutor califica cada respuesta." : "Te autoevalúas con la respuesta modelo."} Apruebas con {PASS_PCT} %.
        </p>
        {lastPct !== null ? (
          <p className="mt-2 text-[15px]">
            Último resultado: <span className="font-semibold tabular-nums">{lastPct} %</span>
          </p>
        ) : null}
        <button type="button" onClick={restart} className={`${buttonPrimary} mt-4 w-full`}>
          {lastPct !== null ? "Repetir evaluación" : "Empezar evaluación"}
        </button>
      </div>
    );
  }

  if (finished) {
    const values = questions.map((x) => scores[x.index] ?? 0);
    const pct = Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 10)) * 100);
    const weak = questions.filter((x) => (scores[x.index] ?? 0) < 7);
    const passed = pct >= PASS_PCT;
    return (
      <div className={`rounded-xl border p-5 ${passed ? "border-accent/30 bg-accent-soft" : "border-amber-300 bg-amber-50"}`} role="status">
        <p className="text-3xl font-semibold tabular-nums">{pct} %</p>
        <p className="mt-1 text-[15px] font-medium">{passed ? `Aprobado (≥ ${PASS_PCT} %).` : `Aún no llegas al ${PASS_PCT} %.`}</p>
        {weak.length ? (
          <div className="mt-3 text-[15px]">
            <p className="font-medium">Repasa:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {weak.map((x) => (
                <li key={x.index}>{x.question}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-3 text-sm text-stone-600">El resultado no bloquea marcar la sesión como hecha.</p>
        <button type="button" onClick={restart} className={`${buttonSecondary} mt-4`}>
          Repetir evaluación
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-sm tabular-nums text-stone-600">
        Pregunta {pos + 1} de {questions.length}
      </p>
      <p className="mt-2 text-[17px] font-medium leading-snug">{q.question}</p>
      <div className="mt-3">
        <AnswerBox id={`e-${q.index}`} value={answer} onChange={setAnswer} tutorEnabled={tutorEnabled} disabled={busy || grade !== null} />
      </div>
      {!revealed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tutorEnabled ? (
            <button type="button" onClick={tutorGrade} disabled={busy || !answer.trim()} className={buttonSecondary}>
              {busy ? "Evaluando…" : "Evaluar con tutor"}
            </button>
          ) : null}
          <button type="button" onClick={() => setRevealed(true)} className={buttonSecondary}>
            {tutorEnabled ? "Ver respuesta y autoevaluarme" : "Ver respuesta"}
          </button>
        </div>
      ) : null}
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
        <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3">
          <p className="text-sm font-semibold text-stone-600">Respuesta modelo</p>
          <Markdown className="mt-1 text-[15px]">{q.answer}</Markdown>
        </div>
      ) : null}
      {revealed && grade ? (
        <button type="button" onClick={() => next(grade.score)} className={`${buttonPrimary} mt-4 w-full`}>
          Siguiente
        </button>
      ) : null}
      {revealed && !grade ? (
        <div className="mt-4">
          <p className="text-sm text-stone-600">¿Cómo te fue?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SELF_GRADES.map((g) => (
              <button key={g.label} type="button" disabled={busy} onClick={() => selfGrade(g.score)} className={buttonSecondary}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
