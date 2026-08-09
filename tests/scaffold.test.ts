import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/scaffold.ts";

const ROOT = join(import.meta.dir, "..");
const identitySchema = JSON.parse(
  readFileSync(join(ROOT, "schemas", "identity.schema.json"), "utf8"),
);

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
