# Bring your own rules

You scaffolded with `enable_rules: false`, so this accelerator did **not** copy bundled neutral rules.

## Options

1. **Copy your rules** into `.cursor/rules/` (keep `office-runtime.mdc`).
2. Re-run scaffold with `enable_rules: false` and `rules_source_dir: ./path/to/your-rules`.
3. Or re-run with `enable_rules: true` to get the accelerator's neutral tri-role pack.

`office-runtime.mdc` is always emitted — it only boots offices (`inject_pack: false`), not company canon.
