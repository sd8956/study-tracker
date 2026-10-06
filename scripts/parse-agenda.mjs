#!/usr/bin/env node
// Uso: node scripts/parse-agenda.mjs [ruta-agenda.md] [salida.sql]
// Por defecto: content/agenda.md -> supabase/seed.sql
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseAgenda, toSeedSql } from "./agenda-parser.mjs";

const input = resolve(process.argv[2] ?? "content/agenda.md");
const output = resolve(process.argv[3] ?? "supabase/seed.sql");

const blocks = parseAgenda(readFileSync(input, "utf8"));
writeFileSync(output, toSeedSql(blocks));

const total = blocks.reduce((n, b) => n + b.sessions.length, 0);
console.log(`OK: ${blocks.length} bloques, ${total} sesiones -> ${output}`);
for (const b of blocks) {
  const cert = b.certificationCode ? ` · ${b.certificationCode} día ${b.certificationDay}` : "";
  console.log(`  Bloque ${b.id} — ${b.title}: ${b.sessions.length} días${cert}`);
}
