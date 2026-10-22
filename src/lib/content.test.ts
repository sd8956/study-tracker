// Validates every real content file against docs/CONTENT-FORMAT.md.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULE_DIR_RE, SESSION_FILE_RE, parseModuleFile, parseSessionFile } from "./content-format";
import { loadPlanFrom } from "./plan";

const CONTENT = join(__dirname, "..", "..", "content");
const MODULES = join(CONTENT, "modules");

const moduleDirs = existsSync(MODULES)
  ? readdirSync(MODULES, { withFileTypes: true })
      .filter((d) => d.isDirectory() && MODULE_DIR_RE.test(d.name))
      .map((d) => d.name)
      .sort()
  : [];

describe("content/modules", () => {
  it("module directories follow NN-slug", () => {
    if (!existsSync(MODULES)) return;
    const bad = readdirSync(MODULES, { withFileTypes: true }).filter((d) => d.isDirectory() && !MODULE_DIR_RE.test(d.name));
    expect(bad.map((d) => d.name)).toEqual([]);
  });

  for (const dir of moduleDirs) {
    describe(dir, () => {
      it("module.md is valid", () => {
        const file = join(MODULES, dir, "module.md");
        expect(existsSync(file), `${dir}/module.md is missing`).toBe(true);
        parseModuleFile(readFileSync(file, "utf8"), `${dir}/module.md`);
      });

      const files = readdirSync(join(MODULES, dir)).filter((f) => SESSION_FILE_RE.test(f)).sort();
      for (const f of files) {
        it(`${f} is valid`, () => {
          parseSessionFile(readFileSync(join(MODULES, dir, f), "utf8"), `${dir}/${f}`);
        });
      }
    });
  }
});

describe("whole plan", () => {
  it("loads with unique keys, all 139 cloud sessions, AI book before the AI tracks and the cloud blocks last", () => {
    const plan = loadPlanFrom(CONTENT);
    const keys = plan.sessions.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(plan.sessions.filter((s) => s.kind === "task")).toHaveLength(139);
    const ids = plan.modules.map((m) => m.id);
    expect(ids.slice(0, 6)).toEqual([
      "01-problem-solving", "02-craft", "03-design-architecture", "04-data-intensive", "05-system-design", "06-microservices",
    ]);
    expect(ids.indexOf("07-ai-engineering")).toBe(ids.indexOf("14-associate-ai-engineer") - 1);
    expect(ids.indexOf("17-scrimba-fullstack")).toBe(ids.indexOf("cloud-b1") - 1);
    expect(ids.slice(-6)).toEqual(["cloud-b1", "cloud-b2", "cloud-b3", "cloud-b4", "cloud-b5", "cloud-b6"]);
  });
});
