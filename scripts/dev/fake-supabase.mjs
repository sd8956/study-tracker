#!/usr/bin/env node
// SOLO DESARROLLO LOCAL. Simula la parte mínima de Supabase (Auth + PostgREST) sobre
// PGlite (Postgres en WASM) con las migraciones y el seed reales, para previsualizar la
// app sin crear un proyecto. Los JWT NO se verifican: nunca exponer esto a una red.
//
// Uso:  node scripts/dev/fake-supabase.mjs [puerto]
//   .env.local -> NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
//                 NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
// Imprime una cookie de sesión para cada usuario de prueba.
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const PORT = Number(process.argv[2] ?? 54321);
const ROOT = join(import.meta.dirname, "..", "..", "supabase");
const USERS = [
  { id: "11111111-1111-1111-1111-111111111111", email: "santiago@example.com" },
  { id: "22222222-2222-2222-2222-222222222222", email: "intruso@example.com" },
];
const TABLES = { blocks: true, sessions: true, progress: true };
const RPCS = { complete_next_session: true, undo_last_session: true, keepalive: true };
const IDENT = /^[a-z_][a-z0-9_]*$/;

const db = new PGlite();
await db.exec(readFileSync(join(ROOT, "tests", "supabase-shim.sql"), "utf8"));
for (const f of readdirSync(join(ROOT, "migrations")).sort()) await db.exec(readFileSync(join(ROOT, "migrations", f), "utf8"));
await db.exec(readFileSync(join(ROOT, "seed.sql"), "utf8"));
for (const u of USERS) await db.query("insert into auth.users (id, email) values ($1, $2)", [u.id, u.email]);

const b64url = (s) => Buffer.from(s).toString("base64url");
function makeJwt(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const payload = { sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", exp };
  return `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}.dev`;
}
function decodeJwt(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return USERS.find((u) => u.id === p.sub) ?? null;
  } catch {
    return null;
  }
}
const userJson = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email" }, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
});
function sessionCookie(user) {
  const host = "localhost";
  const access = makeJwt(user);
  const session = {
    access_token: access, token_type: "bearer", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: "dev-refresh", user: userJson(user),
  };
  return `sb-${host}-auth-token=base64-${b64url(JSON.stringify(session))}`;
}

async function asRole(user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user?.id ?? ""]);
    return tx.query(sql, params);
  });
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}
const pgError = (e) => ({ code: e.code ?? "P0001", message: e.message, details: null, hint: null });
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const user = decodeJwt(bearer);
  try {
    if (url.pathname === "/auth/v1/user") return user ? send(res, 200, userJson(user)) : send(res, 401, { code: 401, msg: "invalid JWT" });
    if (url.pathname === "/auth/v1/logout") return send(res, 204);
    if (url.pathname === "/auth/v1/otp") {
      const body = JSON.parse((await readBody(req)) || "{}");
      console.log(`[fake-auth] magic link solicitado para ${body.email}`);
      return send(res, 200, {});
    }
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
    if (rpc && RPCS[rpc[1]]) {
      const args = JSON.parse((await readBody(req)) || "{}");
      const names = Object.keys(args).filter((k) => IDENT.test(k));
      const sql = `select public.${rpc[1]}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`;
      const r = await asRole(user, sql, names.map((n) => args[n]));
      return send(res, 200, r.rows[0].r);
    }
    const table = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
    if (table && TABLES[table] && req.method === "GET") {
      const cols = (url.searchParams.get("select") ?? "*").split(",").map((c) => c.trim()).filter((c) => c === "*" || IDENT.test(c));
      const where = [];
      const params = [];
      let order = "";
      for (const [k, v] of url.searchParams) {
        if (k === "select") continue;
        if (k === "order") {
          const [col, dir] = v.split(".");
          if (IDENT.test(col)) order = ` order by ${col} ${dir === "desc" ? "desc" : "asc"}`;
          continue;
        }
        if (IDENT.test(k) && v.startsWith("eq.")) {
          params.push(v.slice(3));
          where.push(`${k}::text = $${params.length}`);
        }
      }
      const sql = `select ${cols.join(", ")} from public.${table}${where.length ? ` where ${where.join(" and ")}` : ""}${order}`;
      const r = await asRole(user, sql, params);
      return send(res, 200, r.rows);
    }
    return send(res, 404, { message: "not found" });
  } catch (e) {
    return send(res, 400, pgError(e));
  }
}).listen(PORT, () => {
  console.log(`fake-supabase escuchando en http://localhost:${PORT}`);
  for (const u of USERS) console.log(`COOKIE ${u.email} ${sessionCookie(u)}`);
});
