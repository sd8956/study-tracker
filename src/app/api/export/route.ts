import { rejectNonLocal } from "@/lib/api";
import { getDb } from "@/lib/db";
import { todayIn, studyTz } from "@/lib/schedule";
import { exportData } from "@/lib/store";

export async function GET(request: Request) {
  const rejected = rejectNonLocal(request);
  if (rejected) return rejected;
  const now = new Date();
  const body = JSON.stringify(exportData(getDb(), now), null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="study-tracker-${todayIn(studyTz(), now)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
