"use client";

import { useState } from "react";
import { GradeResult } from "@/components/grade-result";
import { Markdown } from "@/components/markdown";
import { buttonSecondary } from "@/components/ui";
import { gradeAnswer, type GradeResponse } from "@/lib/client-api";
import { AnswerBox } from "./answer-box";

type Q = { index: number; question: string; answer: string };

export function ReviewQuestions({ sessionKey, questions, tutorEnabled }: { sessionKey: string; questions: Q[]; tutorEnabled: boolean }) {
  return (
    <ol className="space-y-4">
      {questions.map((q) => (
        <li key={q.index}>
          <QuestionCard sessionKey={sessionKey} q={q} tutorEnabled={tutorEnabled} />
        </li>
      ))}
    </ol>
  );
}

function QuestionCard({ sessionKey, q, tutorEnabled }: { sessionKey: string; q: Q; tutorEnabled: boolean }) {
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grade_() {
    setPending(true);
    setError(null);
    const r = await gradeAnswer({ sessionKey, questionIndex: q.index, kind: "review", answer });
    setPending(false);
    if (r.ok) setGrade(r.data);
    else setError(r.error);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-[15px] font-medium leading-snug">
        <span className="tabular-nums text-stone-500">{q.index}. </span>
        {q.question}
      </p>
      <div className="mt-3">
        <AnswerBox id={`r-${q.index}`} value={answer} onChange={setAnswer} tutorEnabled={tutorEnabled} rows={3} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {tutorEnabled ? (
          <button type="button" onClick={grade_} disabled={pending || !answer.trim()} className={buttonSecondary}>
            {pending ? "Evaluando…" : "Evaluar con tutor"}
          </button>
        ) : null}
        <button type="button" onClick={() => setRevealed((v) => !v)} className={buttonSecondary} aria-expanded={revealed}>
          {revealed ? "Ocultar respuesta" : "Ver respuesta"}
        </button>
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
        <div className="mt-3 rounded-xl bg-stone-50 px-4 py-3">
          <p className="text-sm font-semibold text-stone-600">Respuesta modelo</p>
          <Markdown className="mt-1 text-[15px]">{q.answer}</Markdown>
        </div>
      ) : null}
    </div>
  );
}
