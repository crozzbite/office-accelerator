import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scaffold } from "../src/scaffold.ts";

const ROOT = join(import.meta.dir, "..");
const SAES_COOKBOOK = readFileSync(
  join(ROOT, "cookbooks", "sdlc-8-stages-saes.yaml"),
  "utf8",
);

/** PATH entries that contain bun or node, so Get-Command cannot find either. */
function pathWithoutBunOrNode(): string {
  const sep = process.platform === "win32" ? ";" : ":";
  const names =
    process.platform === "win32"
      ? ["bun.exe", "bun.cmd", "bun", "node.exe", "node.cmd", "node"]
      : ["bun", "node"];
  return (process.env.PATH ?? "")
    .split(sep)
    .filter((dir) => dir && !names.some((n) => existsSync(join(dir, n))))
    .join(sep);
}

const CORE = [
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
];

function runSmoke(
  skflowRoot: string,
  extraEnv: Record<string, string> = {},
): { exitCode: number; stderr: string; stdout: string } {
  const env = { ...process.env, SKFLOW_ROOT: skflowRoot, ...extraEnv };
  if (extraEnv.PATH !== undefined) {
    env.Path = extraEnv.PATH;
    env.PATH = extraEnv.PATH;
  }
  const proc = Bun.spawnSync(
    [
      "powershell",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(ROOT, "scripts", "smoke-offices.ps1"),
    ],
    {
      env,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

describe("smoke-offices SAE count contract", () => {
  test("sdlc-8-stages-saes cookbook roster is 15", () => {
    expect(SAES_COOKBOOK).toMatch(/^saes:\s*$/m);
    const roster = SAES_COOKBOOK.match(/^    - [a-z0-9_]+/gm) ?? [];
    expect(roster).toHaveLength(15);
  });

  test("smoke FAILs when SkullRender-Agents sibling is missing (not SKIP)", () => {
    const isolated = mkdtempSync(join(tmpdir(), "oa-smoke-nosib-"));
    const scriptsDir = join(isolated, "scripts");
    mkdirSync(scriptsDir);
    cpSync(
      join(ROOT, "scripts", "smoke-offices.ps1"),
      join(scriptsDir, "smoke-offices.ps1"),
    );
    const out = mkdtempSync(join(tmpdir(), "oa-smoke-core-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    const proc = Bun.spawnSync(
      [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        join(scriptsDir, "smoke-offices.ps1"),
      ],
      {
        env: { ...process.env, SKFLOW_ROOT: out },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const combined = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
    expect(proc.exitCode ?? 1, combined).not.toBe(0);
    expect(combined).toMatch(/FAIL: AgentsManager load gate \(Agents sibling missing/);
    expect(combined).not.toMatch(/SKIP: AgentsManager load gate/);
  });

  test("smoke FAILs when PATH has neither bun nor node (load gate, not SKIP)", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-smoke-nobin-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: out,
    });
    const stripped = pathWithoutBunOrNode();
    const result = runSmoke(out, { PATH: stripped });
    const combined = `${result.stdout}\n${result.stderr}`;
    expect(result.exitCode, combined).not.toBe(0);
    expect(combined).toMatch(/FAIL: AgentsManager load gate \(bun required/);
    expect(combined).not.toMatch(/SKIP: AgentsManager load gate/);
  });

  test("smoke PASSes a sdlc-8-stages-saes tree with 15 Sae", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-smoke-sae-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages-saes",
      outDir: out,
    });
    const result = runSmoke(out);
    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/15 Sae/);
  });

  test("smoke FAILs when cookbook declared saes: but tree has 0 Sae", () => {
    const out = mkdtempSync(join(tmpdir(), "oa-smoke-zero-"));
    const src = mkdtempSync(join(tmpdir(), "oa-smoke-core-"));
    scaffold({
      paramsPath: join(ROOT, "params.vsc-neutral.yaml"),
      cookbookId: "sdlc-8-stages",
      outDir: src,
    });
    mkdirSync(join(out, "manifests"), { recursive: true });
    for (const id of CORE) {
      cpSync(join(src, "manifests", `${id}.yaml`), join(out, "manifests", `${id}.yaml`));
    }
    writeFileSync(
      join(out, "scaffold-meta.json"),
      JSON.stringify({ cookbook: "sdlc-8-stages-saes", manifests: [] }, null, 2),
      "utf8",
    );
    const result = runSmoke(out);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/declared saes:|expected 15 Sae/);
  });
});
