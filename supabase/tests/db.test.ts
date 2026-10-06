import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

type Role = "anon" | "authenticated" | "service_role";

async function as<T = Record<string, unknown>>(role: Role, sub: string | null, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx: Transaction) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [sub ?? ""]);
    return tx.query<T>(sql, params);
  });
}

const complete = (sub: string, id: number) =>
  as<{ r: { completed: number; next: number | null } }>("authenticated", sub, "select public.complete_next_session($1) as r", [id]);
const undo = (sub: string, id: number | null = null) =>
  as<{ r: { undone: number } }>("authenticated", sub, "select public.undo_last_session($1) as r", [id]);
const myProgress = async (sub: string) =>
  (await as<{ session_id: number }>("authenticated", sub, "select session_id from public.progress order by session_id")).rows.map(
    (r) => r.session_id,
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(__dirname, "supabase-shim.sql"), "utf8"));
  for (const f of readdirSync(join(root, "migrations")).sort()) {
    await db.exec(readFileSync(join(root, "migrations", f), "utf8"));
  }
  await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
  await db.query("insert into auth.users (id, email) values ($1, 'a@example.com'), ($2, 'b@example.com')", [A, B]);
});

describe("seed", () => {
  it("carga 6 bloques y 139 sesiones coherentes", async () => {
    const blocks = await db.query<{ n: number; days: number }>("select count(*)::int n, sum(total_days)::int days from public.blocks");
    expect(blocks.rows[0]).toEqual({ n: 6, days: 139 });
    const sessions = await db.query<{ n: number; maxpos: number }>("select count(*)::int n, max(position)::int maxpos from public.sessions");
    expect(sessions.rows[0]).toEqual({ n: 139, maxpos: 139 });
  });

  it("es idempotente (se puede re-ejecutar)", async () => {
    await db.exec(readFileSync(join(root, "seed.sql"), "utf8"));
    const r = await db.query<{ n: number }>("select count(*)::int n from public.sessions");
    expect(r.rows[0].n).toBe(139);
  });
});

describe("anon", () => {
  it("no puede leer curriculum ni progreso", async () => {
    await expect(as("anon", null, "select * from public.sessions")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select * from public.blocks")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select * from public.progress")).rejects.toThrow(/permission denied/);
  });

  it("no puede ejecutar las RPC de progreso", async () => {
    await expect(as("anon", null, "select public.complete_next_session(1)")).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, "select public.undo_last_session()")).rejects.toThrow(/permission denied/);
  });

  it("solo puede llamar keepalive", async () => {
    const r = await as<{ ok: boolean }>("anon", null, "select public.keepalive() as ok");
    expect(r.rows[0].ok).toBe(true);
  });
});

describe("authenticated: reglas de secuencia", () => {
  it("lee el curriculum", async () => {
    const r = await as<{ n: number }>("authenticated", A, "select count(*)::int n from public.sessions");
    expect(r.rows[0].n).toBe(139);
  });

  it("solo puede marcar la sesión current", async () => {
    await expect(complete(A, 2)).rejects.toThrow(/not_current_session/);
    const r1 = await complete(A, 1);
    expect(r1.rows[0].r).toEqual({ completed: 1, next: 2 });
    await expect(complete(A, 1)).rejects.toThrow(/not_current_session/); // ya hecha
    await expect(complete(A, 3)).rejects.toThrow(/not_current_session/); // salto
    await complete(A, 2);
    expect(await myProgress(A)).toEqual([1, 2]);
  });

  it("la regla también aplica a INSERT directo (PostgREST) y fija completed_at", async () => {
    await expect(as("authenticated", A, "insert into public.progress (session_id) values (10)")).rejects.toThrow(/not_current_session/);
    await as("authenticated", A, "insert into public.progress (session_id, completed_at) values (3, '2000-01-01')");
    const r = await as<{ y: number }>("authenticated", A, "select extract(year from completed_at)::int y from public.progress where session_id = 3");
    expect(r.rows[0].y).not.toBe(2000);
  });

  it("undo solo de la última", async () => {
    await expect(undo(A, 1)).rejects.toThrow(/not_last_session/);
    await expect(as("authenticated", A, "delete from public.progress where session_id = 1")).rejects.toThrow(/not_last_session/);
    await expect(as("authenticated", A, "delete from public.progress")).rejects.toThrow(/not_last_session/);
    const r = await undo(A, 3);
    expect(r.rows[0].r).toEqual({ undone: 3 });
    const r2 = await undo(A);
    expect(r2.rows[0].r).toEqual({ undone: 2 });
    expect(await myProgress(A)).toEqual([1]);
  });

  it("no hay UPDATE ni TRUNCATE", async () => {
    await expect(as("authenticated", A, "update public.progress set completed_at = now()")).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, "truncate public.progress")).rejects.toThrow(/permission denied/);
  });

  it("nothing_to_undo cuando no hay progreso", async () => {
    await expect(undo(B)).rejects.toThrow(/nothing_to_undo/);
  });

  it("sin auth.uid() las RPC fallan", async () => {
    await expect(as("authenticated", null, "select public.complete_next_session(1)")).rejects.toThrow(/not_authenticated/);
  });
});

describe("authenticated: aislamiento entre usuarios", () => {
  it("B no ve ni toca el progreso de A", async () => {
    expect(await myProgress(B)).toEqual([]);
    await expect(
      as("authenticated", B, "insert into public.progress (user_id, session_id) values ($1, 2)", [A]),
    ).rejects.toThrow(/not_current_session|row-level security/);
    // Aunque la regla de secuencia pase (sesión 1), RLS impide escribir con otro user_id.
    await expect(
      as("authenticated", B, "insert into public.progress (user_id, session_id) values ($1, 1)", [A]),
    ).rejects.toThrow(/row-level security/);
    const del = await as("authenticated", B, "delete from public.progress where user_id = $1", [A]);
    expect(del.affectedRows ?? 0).toBe(0);
    expect(await myProgress(A)).toEqual([1]);
  });

  it("el progreso de B es independiente (empieza en la sesión 1)", async () => {
    await expect(complete(B, 2)).rejects.toThrow(/not_current_session/);
    await complete(B, 1);
    expect(await myProgress(B)).toEqual([1]);
  });
});

describe("fin de ruta y administración", () => {
  it("route_complete tras las 139", async () => {
    const C = "33333333-3333-3333-3333-333333333333";
    await db.query("insert into auth.users (id) values ($1)", [C]);
    let last: { completed: number; next: number | null } | undefined;
    for (let i = 1; i <= 139; i++) last = (await complete(C, i)).rows[0].r;
    expect(last).toEqual({ completed: 139, next: null });
    await expect(complete(C, 139)).rejects.toThrow(/route_complete/);
  });

  it("borrar un usuario (admin) borra su progreso en cascada sin chocar con el trigger", async () => {
    await db.query("delete from auth.users where id = '33333333-3333-3333-3333-333333333333'");
    const r = await db.query<{ n: number }>("select count(*)::int n from public.progress where user_id = '33333333-3333-3333-3333-333333333333'");
    expect(r.rows[0].n).toBe(0);
  });
});
