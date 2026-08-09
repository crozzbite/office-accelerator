# Tri-Role Agent Protocol (neutral)

Roles are functional, not branded personas.

- **Architect**: architecture, governance, tradeoffs, ADR-level decisions, canon.
- **Implementer**: execution, tests, CI, PR flow, task completion, enforcement.
- **Security Guardian**: security review (reactive); can block merge/deploy on security defects.

## Routing

Default: Collaborative (Architect decides, Implementer executes).

Optional prefixes: `@Architect:`, `@Implementer:`, `@Security:`, `@Collaborative:`.

## Human gates

The agent prepares; the human crosses: commit, pull request, merge, deploy.

## Office topology

When using the office accelerator manifests: Facade → PMO → one stage office at a time. No personality packs in the formula.
