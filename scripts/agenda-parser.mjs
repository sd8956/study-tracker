// Pure parser for content/agenda.md -> structured blocks/sessions + seed SQL.
// No I/O here so it can be unit-tested. The CLI lives in parse-agenda.mjs.

const BLOCK_RE = /^##\s+Bloque\s+(\d+)\s+[—–-]\s+(.+?)\s*$/;
const SESSION_RE = /^###\s+Día\s+(\d+)\s+·\s+(\d+)\s*h\s+·\s+(.+?)\s*$/;
const H2_RE = /^##\s+/;
const URL_RE = /https?:\/\/[^\s<>()]+/g;
const CERT_CODE_RE = /\b[A-Z]{3}-C\d{2}\b/;

/**
 * @typedef {{ url: string, label: string }} AgendaLink
 * @typedef {{ day: number, hours: number, title: string, description: string, links: AgendaLink[] }} AgendaSession
 * @typedef {{ id: number, title: string, goal: string, certification: string | null,
 *   certificationCode: string | null, certificationDay: number | null, totalDays: number,
 *   sessions: AgendaSession[] }} AgendaBlock
 */

/** @param {string} text */
export function extractUrls(text) {
  const found = text.match(URL_RE) ?? [];
  return found.map((u) => u.replace(/[.,;:]+$/, ""));
}

/** @param {string} text */
export function stripUrls(text) {
  return text
    .replace(URL_RE, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * "Ninguna." / "Ninguna. FinOps..." -> null
 * "Día 29 de este bloque: AWS Solutions Architect Professional SAP-C03." -> {...}
 * @param {string} raw
 */
export function parseCertification(raw) {
  const text = raw.trim();
  if (/^ninguna\b/i.test(text)) return { certification: null, certificationCode: null, certificationDay: null };
  const m = text.match(/^Día\s+(\d+)\s+de este bloque:\s*(.+?)\.?$/);
  if (!m) throw new Error(`Certificación no reconocida: "${raw}"`);
  const name = m[2].trim();
  const code = name.match(CERT_CODE_RE)?.[0] ?? null;
  return { certification: name, certificationCode: code, certificationDay: Number(m[1]) };
}

/**
 * @param {string} markdown
 * @returns {AgendaBlock[]}
 */
export function parseAgenda(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  /** @type {AgendaBlock[]} */
  const blocks = [];
  /** @type {AgendaBlock | null} */
  let block = null;
  /** @type {(AgendaSession & { _body: string[] }) | null} */
  let session = null;

  const closeSession = () => {
    if (!session || !block) return;
    const body = session._body.join(" ").replace(/\s+/g, " ").trim();
    const urls = extractUrls(body);
    const title = session.title;
    block.sessions.push({
      day: session.day,
      hours: session.hours,
      title,
      description: stripUrls(body),
      links: urls.map((url, i) => ({ url, label: urls.length > 1 ? `${title} (${i + 1})` : title })),
    });
    session = null;
  };

  for (const line of lines) {
    const blockMatch = line.match(BLOCK_RE);
    if (blockMatch) {
      closeSession();
      block = {
        id: Number(blockMatch[1]),
        title: blockMatch[2].trim(),
        goal: "",
        certification: null,
        certificationCode: null,
        certificationDay: null,
        totalDays: 0,
        sessions: [],
      };
      blocks.push(block);
      continue;
    }
    if (H2_RE.test(line)) {
      // Any other "## ..." section (Certificaciones, IA opcional, Qué no entra) ends block parsing.
      closeSession();
      block = null;
      continue;
    }
    if (!block) continue;

    const sessionMatch = line.match(SESSION_RE);
    if (sessionMatch) {
      closeSession();
      session = {
        day: Number(sessionMatch[1]),
        hours: Number(sessionMatch[2]),
        title: sessionMatch[3].trim(),
        description: "",
        links: [],
        _body: [],
      };
      continue;
    }

    if (session) {
      if (line.trim()) session._body.push(line.trim());
      continue;
    }

    // Block header metadata (before the first session).
    const meta = line.match(/^Meta:\s*(.+)$/);
    if (meta) {
      block.goal = meta[1].trim();
      continue;
    }
    const cert = line.match(/^Certificación:\s*(.+)$/);
    if (cert) {
      Object.assign(block, parseCertification(cert[1]));
      continue;
    }
    const days = line.match(/^(\d+)\s+días\.?\s*$/);
    if (days) block.totalDays = Number(days[1]);
  }
  closeSession();

  validateAgenda(blocks);
  return blocks;
}

/** @param {AgendaBlock[]} blocks */
export function validateAgenda(blocks) {
  if (blocks.length === 0) throw new Error("No se encontraron bloques");
  blocks.forEach((b, i) => {
    if (b.id !== i + 1) throw new Error(`Bloque fuera de orden: esperado ${i + 1}, encontrado ${b.id}`);
    if (!b.goal) throw new Error(`Bloque ${b.id}: falta Meta`);
    if (b.totalDays !== b.sessions.length) {
      throw new Error(`Bloque ${b.id}: declara ${b.totalDays} días pero tiene ${b.sessions.length} sesiones`);
    }
    b.sessions.forEach((s, j) => {
      if (s.day !== j + 1) throw new Error(`Bloque ${b.id}: día fuera de orden (esperado ${j + 1}, encontrado ${s.day})`);
      if (s.hours !== 2 && s.hours !== 3) throw new Error(`Bloque ${b.id} día ${s.day}: horas inválidas ${s.hours}`);
      if (!s.description) throw new Error(`Bloque ${b.id} día ${s.day}: sin descripción`);
    });
    if (b.certificationDay !== null && (b.certificationDay < 1 || b.certificationDay > b.totalDays)) {
      throw new Error(`Bloque ${b.id}: día de certificación fuera de rango`);
    }
  });
}

/** @param {string | null} value */
function sqlText(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Idempotent seed: upserts blocks and sessions; never touches progress.
 * sessions.id == sessions.position == global order (1..N).
 * @param {AgendaBlock[]} blocks
 */
export function toSeedSql(blocks) {
  const total = blocks.reduce((n, b) => n + b.sessions.length, 0);
  const out = [];
  out.push("-- GENERADO por scripts/parse-agenda.mjs a partir de content/agenda.md. No editar a mano.");
  out.push(`-- ${blocks.length} bloques, ${total} sesiones.`);
  out.push("begin;");
  out.push("");
  out.push("insert into public.blocks (id, title, goal, certification, certification_code, certification_day, total_days) values");
  out.push(
    blocks
      .map(
        (b) =>
          `  (${b.id}, ${sqlText(b.title)}, ${sqlText(b.goal)}, ${sqlText(b.certification)}, ${sqlText(b.certificationCode)}, ${b.certificationDay ?? "null"}, ${b.totalDays})`,
      )
      .join(",\n"),
  );
  out.push(
    "on conflict (id) do update set title = excluded.title, goal = excluded.goal, certification = excluded.certification,",
  );
  out.push(
    "  certification_code = excluded.certification_code, certification_day = excluded.certification_day, total_days = excluded.total_days;",
  );
  out.push("");
  out.push("insert into public.sessions (id, position, block_id, day, hours, title, description, links) values");
  let position = 0;
  const rows = [];
  for (const b of blocks) {
    for (const s of b.sessions) {
      position += 1;
      rows.push(
        `  (${position}, ${position}, ${b.id}, ${s.day}, ${s.hours}, ${sqlText(s.title)}, ${sqlText(s.description)}, ${sqlText(JSON.stringify(s.links))}::jsonb)`,
      );
    }
  }
  out.push(rows.join(",\n"));
  out.push(
    "on conflict (id) do update set position = excluded.position, block_id = excluded.block_id, day = excluded.day, hours = excluded.hours,",
  );
  out.push("  title = excluded.title, description = excluded.description, links = excluded.links;");
  out.push("");
  out.push("commit;");
  out.push("");
  return out.join("\n");
}
