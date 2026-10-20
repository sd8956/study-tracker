"use client";

import { useState, useTransition } from "react";
import { saveNoteAction } from "@/app/(app)/actions";
import { GradeResult } from "@/components/grade-result";
import { buttonSecondary } from "@/components/ui";
import { gradeAnswer, type GradeResponse } from "@/lib/client-api";
import { AnswerBox } from "./answer-box";

export function FeynmanBox({ sessionKey, initial, tutorEnabled }: { sessionKey: string; initial: string; tutorEnabled: boolean }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [saving, startSave] = useTransition();

  function save() {
    startSave(async () => {
      setError(null);
      const r = await saveNoteAction(sessionKey, text);
      if (r.ok) setSaved(text);
      else setError(r.error);
    });
  }

  async function feedback() {
    setGrading(true);
    setError(null);
    const [noteResult, r] = await Promise.all([saveNoteAction(sessionKey, text), gradeAnswer({ sessionKey, questionIndex: 0, kind: "feynman", answer: text })]);
    setGrading(false);
    if (noteResult.ok) setSaved(text);
    if (r.ok) setGrade(r.data);
    else setError(r.error);
  }

  return (
    <div className="space-y-3">
      <AnswerBox
        id="feynman"
        value={text}
        onChange={setText}
        tutorEnabled={tutorEnabled}
        rows={6}
        placeholder="Explícalo como si se lo contaras a alguien que empieza…"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={saving || text === saved} className={buttonSecondary}>
          {saving ? "Guardando…" : text === saved && saved ? "Guardado" : "Guardar nota"}
        </button>
        {tutorEnabled ? (
          <button type="button" onClick={feedback} disabled={grading || !text.trim()} className={buttonSecondary}>
            {grading ? "Evaluando…" : "Pedir feedback al tutor"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {grade ? <GradeResult grade={grade} /> : null}
    </div>
  );
}
