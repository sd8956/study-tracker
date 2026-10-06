import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractUrls, parseAgenda, parseCertification, stripUrls, toSeedSql } from "./agenda-parser.mjs";

const md = readFileSync(join(__dirname, "..", "content", "agenda.md"), "utf8");
const blocks = parseAgenda(md);
const day = (b: number, d: number) => blocks[b - 1].sessions[d - 1];

describe("parseAgenda (agenda real)", () => {
  it("6 bloques con (30, 30, 20, 22, 15, 22) = 139 sesiones", () => {
    expect(blocks.map((b) => b.sessions.length)).toEqual([30, 30, 20, 22, 15, 22]);
    expect(blocks.reduce((n, b) => n + b.sessions.length, 0)).toBe(139);
  });

  it("títulos y metas de bloque", () => {
    expect(blocks[0].title).toBe("IaC auditable");
    expect(blocks[0].goal).toBe("Otra persona despliega y destruye el repo con el README.");
    expect(blocks[5].title).toBe("Baseline AWS y Security Specialty");
  });

  it("certificaciones solo en bloques 2 y 6", () => {
    expect(blocks.map((b) => b.certificationCode)).toEqual([null, "SAP-C03", null, null, null, "SCS-C03"]);
    expect(blocks[1].certificationDay).toBe(29);
    expect(blocks[5].certificationDay).toBe(21);
    expect(blocks[1].certification).toBe("AWS Solutions Architect Professional SAP-C03");
  });

  it("chequeo manual de sesiones contra el markdown", () => {
    expect(day(1, 1)).toEqual({
      day: 1,
      hours: 2,
      title: "Get Started de Terraform",
      description: "Tutorial oficial hasta el primer apply en la cuenta de laboratorio.",
      links: [{ url: "https://developer.hashicorp.com/terraform/tutorials/aws-get-started", label: "Get Started de Terraform" }],
    });
    expect(day(1, 12).title).toBe("OIDC");
    expect(day(1, 3).description).toBe("terraform state list y show. .gitignore de Terraform. El state no se sube.");
    expect(day(1, 13).links[0].url).toBe("https://www.checkov.io/1.Welcome/Quick%20Start.html");
    expect(day(1, 30)).toMatchObject({ hours: 3, title: "Cierre" });
    expect(day(2, 29)).toMatchObject({ hours: 3, title: "Examen SAP-C03", links: [] });
    expect(day(3, 13)).toMatchObject({ title: "Pricing Calculator", description: "Una alternativa costeada." });
    expect(day(3, 13).links[0].url).toBe("https://calculator.aws");
    expect(day(4, 14)).toMatchObject({ hours: 3, title: "BOLA implementado", description: "Un comercio lee el recurso de otro." });
    expect(day(5, 15)).toMatchObject({ hours: 3, title: "Tag", description: "pipeline-v0.1. No añadas ZAP ni Cosign." });
    expect(day(6, 22)).toMatchObject({ hours: 2, title: "Cierre" });
  });

  it("todas las URLs del markdown dentro de bloques terminan como links", () => {
    const total = blocks.flatMap((b) => b.sessions.flatMap((s) => s.links)).length;
    expect(total).toBe(22);
    for (const s of blocks.flatMap((b) => b.sessions)) expect(s.description).not.toMatch(/https?:\/\//);
  });

  it("ignora 'IA, opcional' y 'Qué no entra'", () => {
    const all = JSON.stringify(blocks);
    expect(all).not.toContain("extractor");
    expect(all).not.toContain("Argo CD");
  });
});

describe("validación", () => {
  const mini = (days: string, sessions: string) =>
    `## Bloque 1 — X\n\nMeta: M\n\nCertificación: Ninguna.\n\n${days}\n\n${sessions}`;

  it("falla si el número de días declarado no coincide", () => {
    expect(() => parseAgenda(mini("2 días.", "### Día 1 · 2 h · A\n\nTexto."))).toThrow(/declara 2 días/);
  });

  it("falla con horas inválidas o días fuera de orden", () => {
    expect(() => parseAgenda(mini("1 días.", "### Día 1 · 4 h · A\n\nTexto."))).toThrow(/horas inválidas/);
    expect(() => parseAgenda(mini("1 días.", "### Día 2 · 2 h · A\n\nTexto."))).toThrow(/fuera de orden/);
  });
});

describe("helpers", () => {
  it("extractUrls / stripUrls", () => {
    const t = "Lee esto. https://a.example/x, y https://b.example/y.";
    expect(extractUrls(t)).toEqual(["https://a.example/x", "https://b.example/y"]);
    expect(stripUrls("Media página. https://a.example/x")).toBe("Media página.");
    expect(stripUrls("terraform state list y show. .gitignore de Terraform.")).toBe("terraform state list y show. .gitignore de Terraform.");
  });

  it("parseCertification", () => {
    expect(parseCertification("Ninguna. FinOps Practitioner no entra.").certification).toBeNull();
    expect(() => parseCertification("Algo raro")).toThrow();
  });

  it("toSeedSql escapa comillas", () => {
    const sql = toSeedSql([
      {
        id: 1, title: "O'Reilly", goal: "g", certification: null, certificationCode: null, certificationDay: null, totalDays: 1,
        sessions: [{ day: 1, hours: 2, title: "t'1", description: "d", links: [] }],
      },
    ]);
    expect(sql).toContain("'O''Reilly'");
    expect(sql).toContain("'t''1'");
  });
});
