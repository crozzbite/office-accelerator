import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Ajv from "ajv";
import { scaffold } from "../src/scaffold.ts";
import { parseSimpleYaml } from "../src/yaml-lite.ts";

const ROOT = join(import.meta.dir, "..");
const identitySchema = JSON.parse(
  readFileSync(join(ROOT, "schemas", "identity.schema.json"), "utf8"),
);
const ajv = new Ajv({ allErrors: true, strict: false });
const validateIdentity = ajv.compile(identitySchema);

type Manifest = {
  id: string;
  office: string;
  stage?: string;
  reports_to: string;
  handoff_owner?: boolean;
  personality_pack_default: boolean;
  permissions?: { tools?: string[]; mcp?: string[]; skills?: string[]; rules?: string[] };
  must?: string[];
  never?: string[];
};

function readManifests(paths: string[]): Manifest[] {
  return paths.map((p) => parseSimpleYaml(readFileSync(p, "utf8")) as unknown as Manifest);
}

function assertManifestRaw(raw: string): void {
  expect(raw).toContain("personality_pack_default: false");
  expect(raw).not.toMatch(/personality_pack:/);
  expect(raw).toMatch(/office:\s*"?(spine|saep|sae)"?/);
  expect(identitySchema.properties.office.enum).not.toContain("personality_pack");
}

describe("office-accelerator scaffold", () => {
  test("enable_rules true emits triad + neutral rules", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-rules-on-"));
    const result = scaffold({
      paramsPath: join(ROOT, "params.example.yaml"),
      cookbookId: "minimal-triad",
      outDir: out,
    });
    expect(result.manifests.length).toBe(3);
    expect(existsSync(join(out, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(out, ".cursor", "rules", "00-tri-role.mdc"))).toBe(
      true,
    );
    expect(existsSync(join(out, ".cursor", "rules", "office-runtime.mdc"))).toBe(
      true,
    );
    expect(existsSync(join(out, "RULES.BYO.md"))).toBe(false);

    for (const f of result.manifests) {
      const raw = readFileSync(f, "utf8");
      assertManifestRaw(raw);
      expect(raw).not.toMatch(/PackLich|PackGentleman|PackCerbero|SkullRender/i);
    }
  });

  test("enable_rules false skips bundled rules and writes BYO", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-rules-off-"));
    const paramsPath = join(out, "params.yaml");
    writeFileSync(
      paramsPath,
      `
org_name: BYO
product_name: BYOApp
id_prefix: Office
enable_packs: false
enable_rules: false
stage_keys:
  - scope
`,
      "utf8",
    );
    scaffold({
      paramsPath,
      cookbookId: "minimal-triad",
      outDir: join(out, "target"),
    });
    const target = join(out, "target");
    expect(existsSync(join(target, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(target, ".cursor", "rules", "00-tri-role.mdc"))).toBe(
      false,
    );
    expect(existsSync(join(target, "RULES.BYO.md"))).toBe(true);
    expect(
      existsSync(join(target, ".cursor", "rules", "office-runtime.mdc")),
    ).toBe(true);
  });

  test("enable_packs true fails", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-packs-"));
    const paramsPath = join(out, "params.yaml");
    writeFileSync(
      paramsPath,
      `enable_packs: true\nenable_rules: false\nproduct_name: X\n`,
      "utf8",
    );
    expect(() =>
      scaffold({
        paramsPath,
        cookbookId: "minimal-triad",
        outDir: join(out, "target"),
      }),
    ).toThrow(/enable_packs/);
  });

  test("sdlc-8-stages emits 10 offices", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-8-"));
    const result = scaffold({
      paramsPath: join(ROOT, "params.example.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    expect(result.manifests.length).toBe(10);
  });

  test("sdlc-8-stages emits no Sae layer and keeps the placeholder must-line", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-8-nosae-"));
    const result = scaffold({
      paramsPath: join(ROOT, "params.example.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    const docs = readManifests(result.manifests);
    expect(docs.filter((d) => d.office === "sae")).toHaveLength(0);
    const arch = docs.find((d) => d.id === "OfficeArchitecture")!;
    expect(arch.must).toContain("Keep Saes under this office reporting here (if any).");
  });
});

describe("office-accelerator Sae layer", () => {
  const EXPECTED_SAES: Record<string, string[]> = {
    OfficeScope: ["OfficeSaeResearch", "OfficeSaeRequirements"],
    OfficeArchitecture: ["OfficeSaeContracts", "OfficeSaeDataModel"],
    OfficeExperience: ["OfficeSaeUx", "OfficeSaeAccessibility"],
    OfficeEngineering: ["OfficeSaeBackend", "OfficeSaeFrontend"],
    OfficeQuality: ["OfficeSaeTestStrategy", "OfficeSaeSecurityReview"],
    OfficeDeploy: ["OfficeSaePipeline", "OfficeSaeIaC"],
    OfficeProduction: ["OfficeSaeObservability", "OfficeSaeIncident"],
    OfficeImprove: ["OfficeSaeAutomation"],
  };

  function scaffoldWithSaes(): Manifest[] {
    const out = mkdtempSync(join(tmpdir(), "oa-sae-"));
    const result = scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages-saes",
      outDir: out,
    });
    return readManifests(result.manifests);
  }

  test("emits 10 offices plus the full 15-Sae catalog", () => {
    const docs = scaffoldWithSaes();
    expect(docs).toHaveLength(25);
    const saeIds = docs.filter((d) => d.office === "sae").map((d) => d.id).sort();
    const expected = Object.values(EXPECTED_SAES).flat().sort();
    expect(saeIds).toEqual(expected);
  });

  test("every Sae reports to an emitted Saep, never to PMO or another Sae", () => {
    const docs = scaffoldWithSaes();
    const saepIds = new Set(docs.filter((d) => d.office === "saep").map((d) => d.id));
    const saeIds = new Set(docs.filter((d) => d.office === "sae").map((d) => d.id));

    for (const sae of docs.filter((d) => d.office === "sae")) {
      expect(saepIds.has(sae.reports_to)).toBe(true);
      expect(sae.reports_to).not.toBe("OfficePmo");
      expect(saeIds.has(sae.reports_to)).toBe(false);
      expect(EXPECTED_SAES[sae.reports_to]).toContain(sae.id);
    }
  });

  test("no Sae can re-delegate or own a stage handoff", () => {
    const docs = scaffoldWithSaes();
    for (const sae of docs.filter((d) => d.office === "sae")) {
      expect(sae.permissions?.tools ?? []).not.toContain("Task");
      expect(sae.handoff_owner).toBe(false);
      expect(sae.personality_pack_default).toBe(false);
    }
  });

  test("a Saep with Saes lists its roster instead of the placeholder", () => {
    const docs = scaffoldWithSaes();
    for (const [saepId, roster] of Object.entries(EXPECTED_SAES)) {
      const saep = docs.find((d) => d.id === saepId)!;
      const must = (saep.must ?? []).join("\n");
      expect(must).toContain(`Delegate expert work only to: ${roster.join(", ")}.`);
      expect(must).not.toContain("(if any)");
    }
  });

  test("each emitted Sae validates against identity.schema.json", () => {
    const docs = scaffoldWithSaes();
    for (const sae of docs.filter((d) => d.office === "sae")) {
      const ok = validateIdentity(sae);
      if (!ok) {
        throw new Error(`identity.schema.json rejected ${sae.id}: ${ajv.errorsText(validateIdentity.errors)}`);
      }
      expect(ok).toBe(true);
    }
  });

  test("saes entry that is not a non-empty array is rejected", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-sae-coerce-"));
    const scalarCookbook = join(out, "scalar.yaml");
    writeFileSync(
      scalarCookbook,
      `id: scalar\nstages:\n  - scope\nsaes:\n  scope: research\n`,
      "utf8",
    );
    expect(() =>
      scaffold({
        paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
        cookbookId: "scalar",
        cookbookPath: scalarCookbook,
        outDir: join(out, "scalar-out"),
      }),
    ).toThrow(/non-empty array/);

    const emptyCookbook = join(out, "empty.yaml");
    writeFileSync(
      emptyCookbook,
      `id: empty\nstages:\n  - scope\nsaes:\n  scope:\n`,
      "utf8",
    );
    expect(() =>
      scaffold({
        paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
        cookbookId: "empty",
        cookbookPath: emptyCookbook,
        outDir: join(out, "empty-out"),
      }),
    ).toThrow(/non-empty array/);
  });

  test("office-runtime.mdc forbids PMO Task of SAE ids", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-runtime-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages-saes",
      outDir: out,
    });
    const runtime = readFileSync(
      join(out, ".cursor", "rules", "office-runtime.mdc"),
      "utf8",
    );
    expect(runtime).toMatch(/SAE \(Sub Agente Experto\)/);
    expect(runtime).toMatch(/PMO \(Project Management Office\) must not Task those SAE ids/);
    expect(runtime).toMatch(/A SAE never hands off to PMO/);
  });

  test("Saes declared for a stage outside the cookbook are rejected", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-sae-orphan-"));
    const cookbook = join(out, "orphan.yaml");
    writeFileSync(
      cookbook,
      `id: orphan\nstages:\n  - scope\nsaes:\n  architecture:\n    - contracts\n`,
      "utf8",
    );
    expect(() =>
      scaffold({
        paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
        cookbookId: "orphan",
        cookbookPath: cookbook,
        outDir: join(out, "target"),
      }),
    ).toThrow(/architecture/);
  });

  test("unknown Sae keys are rejected", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-sae-unknown-"));
    const cookbook = join(out, "unknown.yaml");
    writeFileSync(
      cookbook,
      `id: unknown\nstages:\n  - scope\nsaes:\n  scope:\n    - not_a_real_sae\n`,
      "utf8",
    );
    expect(() =>
      scaffold({
        paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
        cookbookId: "unknown",
        cookbookPath: cookbook,
        outDir: join(out, "target"),
      }),
    ).toThrow(/not_a_real_sae/);
  });
});

describe("office-accelerator packaging", () => {
  test("scaffold-meta.json lists POSIX paths relative to outDir (no machine users)", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-meta-"));
    scaffold({
      paramsPath: join(ROOT, "params.example.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    const meta = JSON.parse(
      readFileSync(join(out, "scaffold-meta.json"), "utf8"),
    ) as { manifests: string[] };
    expect(meta.manifests).toHaveLength(10);
    for (const p of meta.manifests) {
      expect(p.startsWith("manifests/")).toBe(true);
      expect(p.endsWith(".yaml")).toBe(true);
      expect(p.includes("\\")).toBe(false);
    }
    const raw = JSON.stringify(meta);
    expect(raw).not.toMatch(/C:\\Users\\|C:\/Users\//);
    expect(raw).not.toMatch(/OneDrive/i);
  });

  test("vsc-neutral Pmo must-lines are valid quoted YAML (no broken | block)", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-vsc-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    const pmo = readFileSync(join(out, "manifests", "OfficePmo.yaml"), "utf8");
    expect(pmo).toContain("id: OfficePmo");
    // Single-line must with colon must be JSON-quoted, not a broken "|\\n  text" list item
    expect(pmo).not.toMatch(/^\s+- \|\r?\n\s{0,2}[A-Za-z]/m);
    expect(pmo).toMatch(/Delegate execution only to:/);
    for (const name of [
      "OfficeFacade",
      "OfficePmo",
      "OfficeScope",
      "OfficeArchitecture",
      "OfficeExperience",
      "OfficeEngineering",
      "OfficeQuality",
      "OfficeDeploy",
      "OfficeProduction",
      "OfficeImprove",
    ]) {
      expect(existsSync(join(out, "manifests", `${name}.yaml`))).toBe(true);
    }
  });

  test("BYO rules_source_dir copies user rules", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-byo-"));
    const userRules = join(out, "my-rules");
    mkdirSync(userRules);
    writeFileSync(join(userRules, "99-mine.mdc"), "# mine\n", "utf8");
    const paramsPath = join(out, "params.yaml");
    writeFileSync(
      paramsPath,
      `
enable_packs: false
enable_rules: false
rules_source_dir: ${userRules.replace(/\\/g, "/")}
product_name: BYO
`,
      "utf8",
    );
    const target = join(out, "target");
    scaffold({
      paramsPath,
      cookbookId: "minimal-triad",
      outDir: target,
    });
    expect(existsSync(join(target, ".cursor", "rules", "99-mine.mdc"))).toBe(
      true,
    );
    expect(
      existsSync(join(target, ".cursor", "rules", "office-runtime.mdc")),
    ).toBe(true);
  });
});
