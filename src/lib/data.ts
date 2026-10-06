import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { buildRoute, type Block, type Link, type RouteState, type Session } from "@/lib/progress";

type BlockRow = {
  id: number;
  title: string;
  goal: string;
  certification: string | null;
  certification_code: string | null;
  certification_day: number | null;
  total_days: number;
};
type SessionRow = {
  id: number;
  position: number;
  block_id: number;
  day: number;
  hours: number;
  title: string;
  description: string;
  links: unknown;
};

function toLinks(value: unknown): Link[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) =>
    v && typeof v === "object" && typeof (v as Link).url === "string"
      ? [{ url: (v as Link).url, label: typeof (v as Link).label === "string" ? (v as Link).label : (v as Link).url }]
      : [],
  );
}

export type RouteData = RouteState & {
  email: string;
  blockById: Map<number, Block>;
};

/** Carga curriculum + progreso del usuario (vía RLS) y deriva el estado. Requiere sesión permitida. */
export const loadRoute = cache(async (): Promise<RouteData> => {
  const { user, supabase } = await requireUser();

  const [blocksRes, sessionsRes, progressRes] = await Promise.all([
    supabase.from("blocks").select("id, title, goal, certification, certification_code, certification_day, total_days").order("id"),
    supabase.from("sessions").select("id, position, block_id, day, hours, title, description, links").order("position"),
    supabase.from("progress").select("session_id").eq("user_id", user.id),
  ]);

  const err = blocksRes.error ?? sessionsRes.error ?? progressRes.error;
  if (err) {
    console.error("[data] load failed", { code: err.code });
    throw new Error("No se pudo cargar la ruta.");
  }

  const blocks: Block[] = (blocksRes.data as BlockRow[]).map((b) => ({
    id: b.id,
    title: b.title,
    goal: b.goal,
    certification: b.certification,
    certificationCode: b.certification_code,
    certificationDay: b.certification_day,
    totalDays: b.total_days,
  }));
  const sessions: Session[] = (sessionsRes.data as SessionRow[]).map((s) => ({
    id: s.id,
    position: s.position,
    blockId: s.block_id,
    day: s.day,
    hours: s.hours,
    title: s.title,
    description: s.description,
    links: toLinks(s.links),
  }));
  const completed = (progressRes.data as { session_id: number }[]).map((p) => p.session_id);

  return {
    ...buildRoute(blocks, sessions, completed),
    email: user.email,
    blockById: new Map(blocks.map((b) => [b.id, b])),
  };
});
