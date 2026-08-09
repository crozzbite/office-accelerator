# Office Accelerator

IaC-style formula for **pack-free Cursor offices**: params + cookbooks → manifests, schemas, and optional neutral rules.

Sibling idea to Bicep/Terraform modules — but for agent **offices**, not cloud resources. Personality packs (branded voices) are **out of the formula**.

## What it emits

| Resource | Always? |
|----------|---------|
| `manifests/*.yaml` (`OfficeFacade`, `OfficePmo`, stage offices) | Yes |
| `schemas/identity.schema.json`, `brief.schema.json` | Yes |
| `.cursor/rules/office-runtime.mdc` + MCP snippet | Yes |
| Neutral `AGENTS.md` + `.cursor/rules/00-*.mdc` | Only if `enable_rules: true` |
| `RULES.BYO.md` (+ optional copy from `rules_source_dir`) | Only if `enable_rules: false` |

## Quick start

```bash
bun install
bun run scaffold -- --params params.example.yaml --cookbook sdlc-8-stages --out ./out/demo
bun test
```

Point Cursor MCP `SKFLOW_ROOT` at `./out/demo` and use a manifests-capable MCP runner (today: [SkullRender-Agents](https://github.com/crozzbite/SkullRender-Agents) `bundle/cli.js` with `inject_pack: false`).

## Params

See [`params.example.yaml`](params.example.yaml):

- `enable_packs: false` — required; `true` fails in v1
- `enable_rules: true|false` — bundled neutral rules vs bring-your-own
- `rules_source_dir` — when rules are off, copy your `.mdc` files into `.cursor/rules/` (keeps `office-runtime.mdc`)

## Cookbooks

- `minimal-triad` — Facade + PMO + Scope
- `sdlc-8-stages` — Facade + PMO + 8 stage offices

## Not in this repo

- Personality packs / branded experts
- Full company governance canon (use your portable governance branch, or BYO rules)
- Copilot `.github/instructions` adapter (Cursor-only v1)
