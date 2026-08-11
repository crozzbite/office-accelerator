# Scope B — VS Code MCP (Fase 2)

Neutral `Office*` offices for Copilot. **No machine paths in git.**

## Layout (this PC)

```
governance/                  ← root container for this workspace
  office-accelerator/        ← Capa B scaffold + scripts
    out/legion-neutral/      ← SKFLOW_ROOT default (gitignored)
    scripts/mcp-offices.ps1
    scripts/smoke-offices.ps1
    templates/mcp.vscode.json.example
  SkullRender-Agents/        ← sibling runtime (bundle/cli.js)
```

> Note: this local environment uses `governance/office-accelerator/` and `governance/SkullRender-Agents/` together, instead of the external sibling layout described in upstream docs.

## Path precedence

1. `SKFLOW_ROOT` env if set → wins  
2. Else `<office-accelerator>/out/legion-neutral`  
3. Agents CLI: `SKFLOW_AGENTS_CLI` else `../SkullRender-Agents/bundle/cli.js` (sibling, no `C:\Users\…`)

## Register MCP (pick one)

### A) Open only `office-accelerator` as folder

```powershell
Copy-Item templates\mcp.vscode.json.example .vscode\mcp.json
# Open this folder in VS Code → ${workspaceFolder}/scripts/mcp-offices.ps1 resolves
```

### B) Dual-root (recommended smoke with Capa A)

Open `vsc-a-plus-b.code-workspace`. Put MCP config on **offices-B** (or user MCP) using the same script under that folder.  
Opening **only** governance-A → offices tools **unavailable** (fail-loud / expected).

## Policy

- `inject_pack: false` always  
- Do not use `skflow_packs_*` / Lich / Gentleman / Cerbero as SoT  
- Success list ids = `OfficeFacade` … `OfficeImprove` only  

## Smoke Copilot (Fase 3)

Full prompt: [`SCOPE-B-FASE3-SMOKE.md`](SCOPE-B-FASE3-SMOKE.md)

Recommended: open `vsc-a-plus-b.code-workspace`, confirm MCP `offices-neutral`, paste the prompt from that file.
