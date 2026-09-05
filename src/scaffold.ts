/**
 * Office Accelerator scaffold CLI
 *
 * Usage:
 *   bun run scaffold -- --params params.example.yaml --cookbook sdlc-8-stages --out ./out/demo
 */
import { mkdirSync, cpSync, writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSimpleYaml, stringifyYaml } from "./yaml-lite.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const STAGE_META: Record<
  string,
  { suffix: string; display: string; summary: string }
> = {
  scope: {
    suffix: "Scope",
    display: "Scope (PM office)",
    summary: "Decide problem in/out/feasibility; owns stage handoff to PMO.",
  },
  architecture: {
    suffix: "Architecture",
    display: "Architecture",
    summary: "ADR/HLD/contracts; owns architecture stage handoff.",
  },
  experience: {
    suffix: "Experience",
    display: "Experience (UX)",
    summary: "Flows, UI, usability acceptance; pack-free by formula.",
  },
  engineering: {
    suffix: "Engineering",
    display: "Engineering",
    summary: "Implement design, tests, prep PR.",
  },
  quality: {
    suffix: "Quality",
    display: "Quality (QA)",
    summary: "Readiness, tests, evidence.",
  },
  deploy: {
    suffix: "Deploy",
    display: "Deploy",
    summary: "CI/CD, release, cutover, rollback plan.",
  },
  production: {
    suffix: "Production",
    display: "Production",
    summary: "Monitoring, incidents, controlled hotfixes.",
  },
  improve: {
    suffix: "Improve",
    display: "Improve",
    summary: "Feedback, automation, adoption.",
  },
};

/** Expert subagents (Sae). Each belongs to exactly one stage office (Saep). */
const SAE_META: Record<
  string,
  { stage: string; suffix: string; display: string; summary: string }
> = {
  research: {
    stage: "scope",
    suffix: "Research",
    display: "Research",
    summary: "Discovery and feasibility evidence for the scope decision.",
  },
  requirements: {
    stage: "scope",
    suffix: "Requirements",
    display: "Requirements",
    summary: "Acceptance criteria and requirement traceability.",
  },
  contracts: {
    stage: "architecture",
    suffix: "Contracts",
    display: "Contracts",
    summary: "Interface contracts, versioning and compatibility impact.",
  },
  data_model: {
    stage: "architecture",
    suffix: "DataModel",
    display: "Data model",
    summary: "Entities, ownership boundaries and migration shape.",
  },
  ux: {
    stage: "experience",
    suffix: "Ux",
    display: "UX",
    summary: "Flows, wireframes and interaction detail.",
  },
  accessibility: {
    stage: "experience",
    suffix: "Accessibility",
    display: "Accessibility",
    summary: "Conformance checks and assistive-technology behaviour.",
  },
  backend: {
    stage: "engineering",
    suffix: "Backend",
    display: "Backend",
    summary: "Server-side implementation against approved contracts.",
  },
  frontend: {
    stage: "engineering",
    suffix: "Frontend",
    display: "Frontend",
    summary: "Client implementation against approved flows.",
  },
  test_strategy: {
    stage: "quality",
    suffix: "TestStrategy",
    display: "Test strategy",
    summary: "Behaviour-first test design and coverage value.",
  },
  security_review: {
    stage: "quality",
    suffix: "SecurityReview",
    display: "Security review",
    summary: "Adversarial review of the changed surface.",
  },
  pipeline: {
    stage: "deploy",
    suffix: "Pipeline",
    display: "Pipeline",
    summary: "Build-test-deploy mechanics and release gating.",
  },
  iac: {
    stage: "deploy",
    suffix: "IaC",
    display: "Infrastructure as Code",
    summary: "Infrastructure modules, plan review and drift.",
  },
  observability: {
    stage: "production",
    suffix: "Observability",
    display: "Observability",
    summary: "Metrics, logs, traces and alert thresholds.",
  },
  incident: {
    stage: "production",
    suffix: "Incident",
    display: "Incident",
    summary: "Triage, mitigation and controlled hotfix path.",
  },
  automation: {
    stage: "improve",
    suffix: "Automation",
    display: "Automation",
    summary: "Automate recurring toil surfaced by feedback.",
  },
};

type Params = {
  org_name?: string;
  product_name?: string;
  id_prefix?: string;
  enable_packs?: boolean;
  enable_rules?: boolean;
  rules_source_dir?: string;
  stage_keys?: string[];
  mcp_allowlist?: string[];
  skills_allowlist?: string[];
};

type Cookbook = {
  id: string;
  description?: string;
  stages?: string[];
  /** stage key → Sae keys from SAE_META. A stage absent here emits no Sae. */
  saes?: unknown;
};

function argValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function mustFalsePacks(params: Params): void {
  if (params.enable_packs === true) {
    throw new Error(
      "enable_packs: true is not supported in v1. Personality packs are outside the accelerator formula.",
    );
  }
}

function officeId(prefix: string, suffix: string): string {
  return `${prefix}${suffix}`;
}

function buildFacade(prefix: string, product: string) {
  return {
    id: officeId(prefix, "Facade"),
    display_name: "Office Facade",
    office: "spine",
    summary: `Human-facing thread for ${product}. Translates colloquial asks into briefs for PMO.`,
    reports_to: "Stakeholder",
    handoff_owner: true,
    permissions: {
      tools: [] as string[],
      mcp: [] as string[],
      skills: [] as string[],
      rules: ["tri-role"],
    },
    personality_pack_default: false,
    must: [
      "Preserve user thread coherence until closed or handed off.",
      "Produce accessible summaries of PMO results.",
    ],
    never: [
      "Inject personality packs.",
      "Bypass PMO for stage activation.",
    ],
  };
}

function buildPmo(
  prefix: string,
  product: string,
  stageIds: string[],
  mcp: string[],
) {
  return {
    id: officeId(prefix, "Pmo"),
    display_name: "Office PMO",
    office: "spine",
    summary: `PMO spine for ${product}: validate Facade→PMO brief, activate ONE stage, kickoff stage office, Human Go.`,
    reports_to: officeId(prefix, "Facade"),
    handoff_owner: true,
    permissions: {
      tools: ["Task", "Read"],
      mcp: mcp.length ? mcp : ["engram"],
      skills: ["sdd-init"],
      rules: ["human-gates"],
    },
    personality_pack_default: false,
    must: [
      "Honour validated Facade⇄PMO briefs.",
      "Activate exactly one stage at a time.",
      "Resolve identity with inject_pack false before delegating.",
      `Delegate execution only to: ${stageIds.join(", ")}.`,
    ],
    never: [
      "Run more than one stage concurrently.",
      "Inject personality packs from this formula.",
      "Speak as final voice to human without Facade synthesis.",
    ],
  };
}

function buildStage(
  prefix: string,
  stageKey: string,
  mcp: string[],
  skills: string[],
  saeIds: string[],
) {
  const meta = STAGE_META[stageKey];
  if (!meta) {
    throw new Error(`Unknown stage_key: ${stageKey}`);
  }
  return {
    id: officeId(prefix, meta.suffix),
    display_name: `Office ${meta.display}`,
    office: "saep",
    stage: stageKey,
    summary: meta.summary,
    reports_to: officeId(prefix, "Pmo"),
    handoff_owner: true,
    permissions: {
      tools: ["Read", "Grep", "Task"],
      mcp: mcp.length ? mcp : ["engram"],
      skills: skills.length ? skills : ["sdd-explore"],
      rules: ["agent-loops"],
    },
    personality_pack_default: false,
    must: [
      "Own stage handoff to PMO after Human Go path.",
      saeIds.length
        ? `Delegate expert work only to: ${saeIds.join(", ")}.`
        : "Keep Saes under this office reporting here (if any).",
    ],
    never: [
      "Enable personality packs unless a consumer overlay explicitly adds them outside this accelerator.",
      "Act as a second PMO.",
    ],
  };
}

function saeId(prefix: string, suffix: string): string {
  return `${prefix}Sae${suffix}`;
}

function buildSae(
  prefix: string,
  saeKey: string,
  mcp: string[],
  skills: string[],
) {
  const meta = SAE_META[saeKey];
  if (!meta) {
    throw new Error(`Unknown sae key: ${saeKey}`);
  }
  const parent = officeId(prefix, STAGE_META[meta.stage]!.suffix);
  return {
    id: saeId(prefix, meta.suffix),
    display_name: `Sae ${meta.display}`,
    office: "sae",
    stage: meta.stage,
    summary: meta.summary,
    reports_to: parent,
    handoff_owner: false,
    permissions: {
      // No Task: an expert subagent produces evidence, it does not re-delegate.
      tools: ["Read", "Grep"],
      mcp: mcp.length ? mcp : ["engram"],
      skills: skills.length ? skills : ["sdd-explore"],
      rules: ["agent-loops"],
    },
    personality_pack_default: false,
    must: [`Deliver evidence to ${parent}, which owns the stage handoff.`],
    never: [
      "Report to PMO or to another Sae.",
      "Delegate work further.",
      "Enable personality packs.",
    ],
  };
}

/** stage key → Sae keys, validated against the cookbook stages and SAE_META. */
function resolveSaes(
  cookbook: Cookbook,
  stages: string[],
): Record<string, string[]> {
  if (cookbook.saes === undefined) {
    return {};
  }
  if (
    cookbook.saes === null ||
    typeof cookbook.saes !== "object" ||
    Array.isArray(cookbook.saes)
  ) {
    throw new Error(
      "Cookbook saes must be a map of stage → non-empty Sae key arrays",
    );
  }
  const declared = cookbook.saes as Record<string, unknown>;
  const resolved: Record<string, string[]> = {};
  for (const [stageKey, saeKeys] of Object.entries(declared)) {
    if (!stages.includes(stageKey)) {
      throw new Error(
        `Cookbook declares saes for stage "${stageKey}" which is not in stages: ${stages.join(", ")}`,
      );
    }
    if (!Array.isArray(saeKeys) || saeKeys.length === 0) {
      throw new Error(
        `Cookbook saes for stage "${stageKey}" must be a non-empty array`,
      );
    }
    const keys = saeKeys.map((k) => String(k));
    for (const key of keys) {
      const meta = SAE_META[key];
      if (!meta) {
        throw new Error(`Unknown sae key: ${key}`);
      }
      if (meta.stage !== stageKey) {
        throw new Error(
          `Sae "${key}" belongs to stage "${meta.stage}", declared under "${stageKey}"`,
        );
      }
    }
    resolved[stageKey] = keys;
  }
  return resolved;
}

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

/** POSIX path relative to `from`. Throws if the result is still absolute or a user home path. */
function posixRel(from: string, to: string): string {
  const rel = relative(from, to).replace(/\\/g, "/");
  if (
    rel.startsWith("/") ||
    /^[A-Za-z]:\//.test(rel) ||
    /(?:^|\/)Users\//i.test(rel) ||
    rel.includes("C:/Users") ||
    rel.includes("C:\\Users")
  ) {
    throw new Error(`Refusing non-portable path in scaffold-meta: ${rel}`);
  }
  return rel;
}

function writeYaml(path: string, doc: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `# Generated by office-accelerator — pack-free\n${stringifyYaml(doc)}`,
    "utf8",
  );
}

function forbiddenBrandHits(text: string): string[] {
  const hits: string[] = [];
  for (const re of [
    /\bPackLich\b/i,
    /\bPackGentleman\b/i,
    /\bPackCerbero\b/i,
    /\bLich\b/,
    /\bGentleman\b/,
    /\bCerbero\b/,
    /\bSkullRender\b/i,
    /\bexperto_/i,
  ]) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}

export function scaffold(opts: {
  paramsPath: string;
  cookbookId: string;
  outDir: string;
  /** Override the bundled cookbook location. Used by tests and BYO formulas. */
  cookbookPath?: string;
}): { outDir: string; manifests: string[] } {
  const params = parseSimpleYaml(readFileSync(opts.paramsPath, "utf8")) as Params;
  mustFalsePacks(params);

  const rulesOn = params.enable_rules ?? true;

  const cookbookPath =
    opts.cookbookPath ?? join(ROOT, "cookbooks", `${opts.cookbookId}.yaml`);
  if (!existsSync(cookbookPath)) {
    throw new Error(`Cookbook not found: ${cookbookPath}`);
  }
  const cookbook = parseSimpleYaml(readFileSync(cookbookPath, "utf8")) as Cookbook;

  const prefix = params.id_prefix ?? "Office";
  const product = params.product_name ?? "Product";
  const stages =
    cookbook.stages?.length
      ? cookbook.stages
      : params.stage_keys ?? ["scope"];
  const mcp = params.mcp_allowlist ?? [];
  const skills = params.skills_allowlist ?? [];

  const out = resolve(opts.outDir);
  mkdirSync(out, { recursive: true });

  const saesByStage = resolveSaes(cookbook, stages);
  const saeDocs = Object.values(saesByStage)
    .flat()
    .map((key) => buildSae(prefix, key, mcp, skills));

  const stageDocs = stages.map((s) =>
    buildStage(
      prefix,
      s,
      mcp,
      skills,
      (saesByStage[s] ?? []).map((key) => saeId(prefix, SAE_META[key]!.suffix)),
    ),
  );
  const stageIds = stageDocs.map((d) => d.id as string);
  const facade = buildFacade(prefix, product);
  const pmo = buildPmo(prefix, product, stageIds, mcp);

  const manifestsDir = join(out, "manifests");
  mkdirSync(manifestsDir, { recursive: true });
  const written: string[] = [];
  for (const doc of [facade, pmo, ...stageDocs, ...saeDocs]) {
    const file = join(manifestsDir, `${doc.id}.yaml`);
    writeYaml(file, doc);
    written.push(file);
  }

  // schemas
  copyDir(join(ROOT, "schemas"), join(out, "schemas"));

  // cursor boot always
  const cursorRules = join(out, ".cursor", "rules");
  mkdirSync(cursorRules, { recursive: true });
  cpSync(
    join(ROOT, "templates", "cursor", "office-runtime.mdc"),
    join(cursorRules, "office-runtime.mdc"),
  );
  cpSync(
    join(ROOT, "templates", "cursor", "mcp.json.snippet.json"),
    join(out, ".cursor", "mcp.json.snippet.json"),
  );

  if (rulesOn) {
    cpSync(
      join(ROOT, "modules", "rules-neutral", "AGENTS.md"),
      join(out, "AGENTS.md"),
    );
    copyDir(
      join(ROOT, "modules", "rules-neutral", "cursor"),
      cursorRules,
    );
    // ensure boot rule wins / remains
    cpSync(
      join(ROOT, "templates", "cursor", "office-runtime.mdc"),
      join(cursorRules, "office-runtime.mdc"),
    );
  } else {
    cpSync(
      join(ROOT, "templates", "cursor", "RULES.BYO.md"),
      join(out, "RULES.BYO.md"),
    );
    if (params.rules_source_dir) {
      const src = resolve(params.rules_source_dir);
      if (!existsSync(src)) {
        throw new Error(`rules_source_dir not found: ${src}`);
      }
      // copy user rules without deleting office-runtime
      for (const name of readdirSync(src)) {
        if (name === "office-runtime.mdc") continue;
        const from = join(src, name);
        const to = join(cursorRules, name);
        cpSync(from, to, { recursive: true });
      }
    }
  }

  // brand scan on manifests
  for (const f of written) {
    const hits = forbiddenBrandHits(readFileSync(f, "utf8"));
    if (hits.length) {
      throw new Error(`Brand/pack leak in ${f}: ${hits.join(", ")}`);
    }
  }

  writeFileSync(
    join(out, "scaffold-meta.json"),
    JSON.stringify(
      {
        cookbook: opts.cookbookId,
        enable_rules: rulesOn,
        enable_packs: false,
        org_name: params.org_name ?? null,
        product_name: product,
        manifests: written.map((p) => posixRel(out, p)),
      },
      null,
      2,
    ),
    "utf8",
  );

  return { outDir: out, manifests: written };
}

function main(): void {
  const argv = process.argv.slice(2);
  const paramsPath = argValue(argv, "--params") ?? join(ROOT, "params.example.yaml");
  const cookbookId = argValue(argv, "--cookbook") ?? "minimal-triad";
  const outDir = argValue(argv, "--out") ?? join(ROOT, "out", "demo");

  const result = scaffold({ paramsPath, cookbookId, outDir });
  console.log(`Scaffolded ${result.manifests.length} manifests → ${result.outDir}`);
}

const isDirect =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  main();
}
