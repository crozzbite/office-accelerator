# Scope B — VS Code MCP (Fase 2)

Neutral `Office*` offices for Copilot. **No machine paths in git.**

Keep **one layout profile per machine**. Do not document both as if they were the same PC.

## Profile A — Portable siblings (default)

```
<parent>/
  office-accelerator/        ← Capa B
    dist/legion-neutral/     ← preferred SKFLOW_ROOT (shipped)
    out/legion-neutral/      ← local scaffold (gitignored)
    scripts/mcp-offices.ps1
    templates/mcp.vscode.json.example
  SkullRender-Agents/        ← runtime (bundle/cli.js)
  governance/                ← optional Capa A
```

## Profile B — Nested under governance (optional workstation)

```
governance/                  ← Capa A root
  office-accelerator/        ← Capa B (often gitignored by A)
  SkullRender-Agents/        ← runtime next to accelerator
```

Use only on machines that cloned this way. Set user env with:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-skflow-env.ps1
```

Do not run that helper on a Profile A machine.

## Path precedence (`mcp-offices.ps1`)

1. `SKFLOW_ROOT` env if set → wins  
2. Else `dist/legion-neutral` if present  
3. Else `out/legion-neutral`  
4. Agents CLI: `SKFLOW_AGENTS_CLI` else `../SkullRender-Agents/bundle/cli.js` relative to accelerator parent

## Register MCP

```powershell
Copy-Item templates\mcp.vscode.json.example .vscode\mcp.json
# Open office-accelerator folder (or dual-root workspace) → ${workspaceFolder}/scripts/mcp-offices.ps1
```

Dual-root: `vsc-a-plus-b.code-workspace` (Profile A paths). Opening **only** Capa A → no `skflow_*` (fail-loud / expected).

## Policy

- `inject_pack: false` always  
- Do not use `skflow_packs_*` / Lich / Gentleman / Cerbero as SoT  
- Success list ids = `OfficeFacade` … `OfficeImprove` only  

## Smoke

```powershell
bun run smoke:neutral
```

Copilot smoke: [`SCOPE-B-FASE3-SMOKE.md`](SCOPE-B-FASE3-SMOKE.md)
