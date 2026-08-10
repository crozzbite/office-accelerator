# Scope B — Fase 3 Copilot smoke (paste in VS Code)

## Before chat (30s)

1. Prefer open: `office-accelerator/vsc-a-plus-b.code-workspace`  
   Or open folder: `office-accelerator` (MCP only; less Capa A).
2. Confirm MCP server **`offices-neutral`** is running (`.vscode/mcp.json` from template).
3. Optional terminal check:
   ```powershell
   cd office-accelerator
   powershell -NoProfile -File .\scripts\smoke-offices.ps1
   ```

## Prompt — paste into Copilot Chat

```
## Scope B Fase 3 smoke — offices neutros + Capa A

Contexto:
- Capa A = tri-rol AGENTS.md (Architect / Implementer / Security Guardian). Sin Lich/Gentleman/Cerbero.
- Capa B = MCP offices-neutral → manifests Office* (SKFLOW_ROOT). inject_pack SIEMPRE false.
- No inventes offices. Si no hay tools skflow_*, dilo (fail-loud).

Ejecuta EN ORDEN y reporta PASS/FAIL por paso:

### 1) Tools
Lista tools MCP disponibles. ¿Existen skflow_agents_list, skflow_identity_resolve, skflow_brief_validate (o equivalentes)?

### 2) Lista offices
Llama skflow_agents_list (o equivalente).
PASS solo si los ids son exactamente el set Office*:
OfficeFacade, OfficePmo, OfficeScope, OfficeArchitecture, OfficeExperience, OfficeEngineering, OfficeQuality, OfficeDeploy, OfficeProduction, OfficeImprove
FAIL si aparece experto_*, Saep*, centinela_*, Lich, Gentleman, Cerbero como SoT.

### 3) Identity sin pack
skflow_identity_resolve id=OfficeArchitecture con inject_pack=false.
PASS si el bloque es office neutro Architecture y NO inyecta personalidad branded.
FAIL si menciona PackLich / Lich / Gentleman / Cerbero como identidad activa.

### 4) Brief validate
skflow_brief_validate con este brief JSON:
{
  "goal": "Smoke Scope B: confirmar offices neutros en VS Code",
  "constraints": ["inject_pack false", "no personality packs", "human gates for commit"],
  "forbidden_capabilities": ["personality_packs", "hardcoded_user_paths"]
}
PASS si valida; FAIL si rechaza — incluye el error.

### 5) Gobernanza (Capa A)
Si AGENTS.md / copilot-instructions están en contexto (multi-root):
- ¿Quién decide canon? ¿Quién implementa? ¿Human gates?
Si solo abriste offices-B: dilo y no inventes References de A.

### 6) Anti-check
NO llames skflow_packs_list como SoT. Si el modelo sugiere packs, debe rechazarlos.

### Entregable
Tabla:
| Paso | PASS/FAIL | Evidencia corta |
Score 1–10. Gaps con ruta/tool. Sin editar archivos.
```

## Expected

| Paso | Esperado |
|------|----------|
| 1 | Tools skflow_* presentes |
| 2 | Exactamente 10× `Office*` |
| 3 | Architecture neutro, `inject_pack: false` |
| 4 | Brief OK |
| 5 | Tri-rol si multi-root; si no, declare “solo B” |
| 6 | Sin packs como SoT |

## Fail-loud (también útil)

Abre **solo** la carpeta Capa A (`WorkDesktop` governance) **sin** MCP offices → el mismo prompt debe decir que **no** hay `skflow_*` / no inventar `Office*`.
