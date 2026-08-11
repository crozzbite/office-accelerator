# Office Accelerator (Scope B — neutral offices)

**What this is (plain language):**  
A small “factory” that generates **agent offices** for a software lifecycle (scope → architecture → build → quality → deploy → …). Think *roles on a team*, not chatbots with fancy personalities.

**What it is not:**  
Not Lich / Gentleman / Cerbero. Not your company rulebook. Personality packs stay **off**.

| Layer | Repo / branch | Job |
|-------|----------------|-----|
| **Capa A — Governance** | [WorkDesktop `governance/vscode-copilot-ready`](https://github.com/crozzbite/WorkDesktop/tree/governance/vscode-copilot-ready) | Tri-role: Architect / Implementer / Security Guardian + Copilot instructions |
| **Capa B — Offices (this repo)** | https://github.com/crozzbite/office-accelerator | `Office*` manifests + VS Code MCP wiring |
| **Runtime MCP** | https://github.com/crozzbite/SkullRender-Agents | Serves manifests via `skflow_*` tools (`inject_pack: false`) |

**Shipped product folder:** `dist/legion-neutral/` (10 offices, pack-free).  
**Local scratch:** `out/` (gitignored). Promote with `bun run promote:neutral`.

---

## Install

### Prerequisites

| Tool | Why |
|------|-----|
| [Git](https://git-scm.com) | Clone |
| [Node.js 18+](https://nodejs.org) | Run MCP CLI |
| [Bun](https://bun.sh) | Scaffold / tests / promote (authoring) |
| VS Code + GitHub Copilot **or** Cursor | Consume offices |

### Clone layout (pick ONE profile per machine — do not mix)

**Path policy:** never commit `C:\Users\…`. Prefer `${workspaceFolder}` + `scripts/mcp-offices.ps1`.

#### Profile A — Portable siblings (default / recommended)

Independent clones side by side. Typical on a personal/dev machine.

```text
<parent>/
  office-accelerator/     ← this repo
  SkullRender-Agents/     ← runtime MCP
  governance/             ← optional Capa A
```

```powershell
cd $env:USERPROFILE\Documents   # or any folder YOU choose
git clone https://github.com/crozzbite/office-accelerator.git
git clone https://github.com/crozzbite/SkullRender-Agents.git
# optional Capa A:
git clone -b governance/vscode-copilot-ready https://github.com/crozzbite/WorkDesktop.git governance

cd office-accelerator
bun install
bun test
bun run promote:neutral

cd ..\SkullRender-Agents
bun install
bun run bundle
```

MCP: copy `templates/mcp.vscode.json.example` → `.vscode/mcp.json` (uses `mcp-offices.ps1`; no user env required if folders are siblings).

#### Profile B — Nested under governance (optional workstation)

Only if Capa A is the workspace root and B/runtime live **inside** it (company/fork machine pattern):

```text
governance/                 ← Capa A root (WorkDesktop ready branch)
  office-accelerator/       ← this repo (gitignored by Capa A)
  SkullRender-Agents/       ← runtime (keep nested; do not assume Profile A paths)
```

```powershell
# From governance\office-accelerator — sets *this user/machine* env only
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-skflow-env.ps1
# Then restart VS Code / terminals so User env is inherited
```

Do **not** run `set-skflow-env.ps1` on a Profile A machine (it would point env at a nested layout you may not have).  
Do **not** commit machine profile choice into shared “required” steps — keep Profile A as the portable default.

---

## Use (VS Code + Copilot)

1. Open **this** folder (`office-accelerator`) **or** `vsc-a-plus-b.code-workspace` (A+B).
2. Register MCP (no absolute paths in the template):

```powershell
New-Item -ItemType Directory -Force -Path .vscode | Out-Null
Copy-Item templates\mcp.vscode.json.example .vscode\mcp.json
```

3. Restart / reload VS Code. Enable MCP server **`offices-neutral`**.
4. In Copilot Chat, tools should include `skflow_agents_list`, `skflow_identity_resolve`, `skflow_brief_validate`.
5. Always call identity with **`inject_pack: false`**. Do **not** treat packs as SoT.

**Fail-loud:** If you open **only** Capa A (governance) without this MCP, `skflow_*` will be missing. That is expected.

Dual-root recipe: open [`vsc-a-plus-b.code-workspace`](vsc-a-plus-b.code-workspace).

More detail: [`docs/SCOPE-B-VSC-MCP.md`](docs/SCOPE-B-VSC-MCP.md) · Fase 3 smoke: [`docs/SCOPE-B-FASE3-SMOKE.md`](docs/SCOPE-B-FASE3-SMOKE.md)

### Office ids (shipped)

`OfficeFacade`, `OfficePmo`, `OfficeScope`, `OfficeArchitecture`, `OfficeExperience`, `OfficeEngineering`, `OfficeQuality`, `OfficeDeploy`, `OfficeProduction`, `OfficeImprove`

---

## Verify

```powershell
cd office-accelerator
bun test
bun run smoke:neutral
```

Expect: `PASS: Office* set (10)` and `PASS: AgentsManager loadAll=10`.

Copilot smoke (with MCP up): paste the prompt in [`docs/SCOPE-B-FASE3-SMOKE.md`](docs/SCOPE-B-FASE3-SMOKE.md).

---

## Deploy / publish (maintainers)

This is not a cloud deploy. “Deploy” = **publish git** so others can clone.

```powershell
# After changing params or yaml-lite / scaffold:
bun test
bun run promote:neutral
bun run smoke:neutral
git add dist/legion-neutral scripts templates params.vsc-neutral.yaml README.md docs
git status
# Human gate: commit + push when ready
```

Consumers only need: clone siblings → `bun install` + `bundle` on Agents → copy MCP template → Open Folder.

Re-scaffold authoring tree (optional):

```powershell
bun run scaffold -- --params params.vsc-neutral.yaml --cookbook sdlc-8-stages --out ./out/legion-neutral
bun run promote:neutral
```

---

## Scaffold (advanced)

```powershell
bun run scaffold -- --params params.example.yaml --cookbook sdlc-8-stages --out ./out/demo
```

| Param | Rule |
|-------|------|
| `enable_packs` | Must be `false` |
| `enable_rules` | `false` for VS Code + Capa A BYO; `true` emits Cursor neutral rules |

Cookbooks: `minimal-triad` · `sdlc-8-stages`

---

## Prompt for Copilot / other LLMs (paste after clone)

Copy everything between the markers into Copilot Chat (or Cursor) **after** cloning this repo and SkullRender-Agents as siblings:

```
--- BEGIN SETUP PROMPT (office-accelerator Scope B) ---
You are setting up Scope B (neutral Office* agents) for VS Code + GitHub Copilot.

Repos:
- This folder = https://github.com/crozzbite/office-accelerator
- Sibling (required runtime) = https://github.com/crozzbite/SkullRender-Agents
- Optional Capa A governance = https://github.com/crozzbite/WorkDesktop branch governance/vscode-copilot-ready

Rules:
- NO hardcoded C:\Users\… paths in any file you write to git.
- Personality packs OFF. inject_pack must stay false. Never treat Lich/Gentleman/Cerbero as SoT.
- Prefer dist/legion-neutral as SKFLOW_ROOT (shipped). out/ is local scratch.
- Path precedence: env SKFLOW_ROOT > dist/legion-neutral > out/legion-neutral
- Agents CLI: env SKFLOW_AGENTS_CLI or sibling ../SkullRender-Agents/bundle/cli.js

Do this in order (one phase at a time; wait for my OK between phases if unsure):
1) Confirm layout: office-accelerator and SkullRender-Agents are siblings. If not, tell me the exact clone commands.
2) In office-accelerator: bun install && bun test && bun run promote:neutral && bun run smoke:neutral
3) In SkullRender-Agents: bun install && bun run bundle
4) Copy templates/mcp.vscode.json.example → .vscode/mcp.json (workspace-relative; no absolutes)
5) Tell me to reload VS Code and enable MCP server "offices-neutral"
6) Give me a 6-step Copilot smoke: skflow_agents_list must return exactly the 10 Office* ids; identity_resolve OfficeArchitecture inject_pack=false; brief_validate a sample brief; reject packs as SoT
7) If I also cloned Capa A, explain dual-root via vsc-a-plus-b.code-workspace; if I open only A, skflow_* missing is expected fail-loud

Do not invent offices. Do not merge Legion YAML into the governance repo.
If smoke fails, report the exact command output and file path.
--- END SETUP PROMPT ---
```

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [`dist/legion-neutral/README.md`](dist/legion-neutral/README.md) | What shipped |
| [`docs/SCOPE-B-VSC-MCP.md`](docs/SCOPE-B-VSC-MCP.md) | MCP wiring |
| [`docs/SCOPE-B-FASE3-SMOKE.md`](docs/SCOPE-B-FASE3-SMOKE.md) | Copilot smoke |
| [`params.vsc-neutral.yaml`](params.vsc-neutral.yaml) | Frozen VS Code params |
