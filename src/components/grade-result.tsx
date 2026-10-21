import type { GradeResponse } from "@/lib/client-api";
import { Markdown } from "./markdown";

export function GradeResult({ grade }: { grade: GradeResponse }) {
  const good = grade.score >= 7;
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 ${good ? "border-accent/30 bg-accent-soft" : "border-amber-300 bg-amber-50"}`}
    >
      <p className="text-sm font-semibold">
        Tutor: <span className="tabular-nums">{grade.score}</span> / 10
      </p>
      {grade.feedback ? <Markdown className="mt-1 text-[15px]">{grade.feedback}</Markdown> : null}
      {grade.missing.length ? (
        <div className="mt-2 text-[15px]">
          <p className="font-medium">Te faltó:</p>
          <ul className="mt-1 list-disc pl-5">
            {grade.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
