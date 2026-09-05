import { describe, expect, test } from "bun:test";
import { parseSimpleYaml } from "../src/yaml-lite.ts";

describe("parseSimpleYaml", () => {
  test("scalars, booleans and numbers", () => {
    const doc = parseSimpleYaml(
      `org_name: Acme\nenable_packs: false\ncount: 8\nempty:\n`,
    );
    expect(doc.org_name).toBe("Acme");
    expect(doc.enable_packs).toBe(false);
    expect(doc.count).toBe(8);
    expect(doc.empty).toBeNull();
  });

  test("top-level block list", () => {
    const doc = parseSimpleYaml(`stages:\n  - scope\n  - architecture\n`);
    expect(doc.stages).toEqual(["scope", "architecture"]);
  });

  test("one-level map of scalars", () => {
    const doc = parseSimpleYaml(`limits:\n  soft: 3\n  hard: 9\n`);
    expect(doc.limits).toEqual({ soft: 3, hard: 9 });
  });

  test("two-level map of lists keeps items under their own key", () => {
    const doc = parseSimpleYaml(
      `saes:\n  architecture:\n    - contracts\n    - data_model\n  engineering:\n    - backend\n`,
    );
    expect(doc.saes).toEqual({
      architecture: ["contracts", "data_model"],
      engineering: ["backend"],
    });
  });

  test("map of lists does not leak items into a sibling top-level key", () => {
    const doc = parseSimpleYaml(
      `saes:\n  quality:\n    - test_strategy\nstages:\n  - scope\n`,
    );
    expect(doc.saes).toEqual({ quality: ["test_strategy"] });
    expect(doc.stages).toEqual(["scope"]);
  });

  test("comments and blank lines inside a nested block are ignored", () => {
    const doc = parseSimpleYaml(
      `saes:\n  # roster\n  deploy:\n\n    - pipeline\n    - iac\n`,
    );
    expect(doc.saes).toEqual({ deploy: ["pipeline", "iac"] });
  });

  test("leading document marker does not drop the cookbook", () => {
    const doc = parseSimpleYaml(
      `---\nsaes:\n  architecture:\n    - contracts\n`,
    );
    expect(doc.saes).toEqual({ architecture: ["contracts"] });
  });

  test("mid-file document marker does not drop later keys", () => {
    const doc = parseSimpleYaml(
      `id: sdlc-8-stages-saes\n---\nstages:\n  - scope\n`,
    );
    expect(doc.id).toBe("sdlc-8-stages-saes");
    expect(doc.stages).toEqual(["scope"]);
  });

  test("document end marker and marker comments are ignored", () => {
    const doc = parseSimpleYaml(
      `--- # cookbook\nsaes:\n  deploy:\n    - pipeline\n...\n`,
    );
    expect(doc.saes).toEqual({ deploy: ["pipeline"] });
  });
});
