# Profile B only — nested under a governance root.
# Sets User-level SKFLOW_ROOT + SKFLOW_AGENTS_CLI for THIS machine.
# Do NOT run on Profile A (portable siblings) machines.
#
# Expected layout:
#   governance/
#     office-accelerator/     (this repo — run script from here)
#     SkullRender-Agents/
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\set-skflow-env.ps1

$ErrorActionPreference = 'Stop'
$AccelRoot = Split-Path -Parent $PSScriptRoot
$Root = Split-Path -Parent $AccelRoot
$SkflowRoot = Join-Path $AccelRoot 'dist\legion-neutral'
$AgentsCli = Join-Path $Root 'SkullRender-Agents\bundle\cli.js'

if (-not (Test-Path -LiteralPath (Join-Path $SkflowRoot 'manifests'))) {
  Write-Error "SKFLOW_ROOT target missing manifests/: $SkflowRoot"
  exit 1
}
if (-not (Test-Path -LiteralPath $AgentsCli)) {
  Write-Error "SKFLOW_AGENTS_CLI target missing: $AgentsCli (Profile B expects Agents next to accelerator under governance/)"
  exit 1
}

[Environment]::SetEnvironmentVariable('SKFLOW_ROOT', $SkflowRoot, 'User')
[Environment]::SetEnvironmentVariable('SKFLOW_AGENTS_CLI', $AgentsCli, 'User')

Write-Host "[set-skflow-env] profile=B-nested"
Write-Host "[set-skflow-env] SKFLOW_ROOT=$SkflowRoot"
Write-Host "[set-skflow-env] SKFLOW_AGENTS_CLI=$AgentsCli"
Write-Host '[set-skflow-env] User env set. Restart shells / VS Code to inherit. Not for Profile A machines.'
