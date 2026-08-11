# Set SKFLOW_ROOT and SKFLOW_AGENTS_CLI for the governance sibling layout.
# Run this from governance\office-accelerator:
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
  Write-Error "SKFLOW_AGENTS_CLI target missing: $AgentsCli"
  exit 1
}

[Environment]::SetEnvironmentVariable('SKFLOW_ROOT', $SkflowRoot, 'User')
[Environment]::SetEnvironmentVariable('SKFLOW_AGENTS_CLI', $AgentsCli, 'User')

Write-Host "[set-skflow-env] SKFLOW_ROOT=$SkflowRoot"
Write-Host "[set-skflow-env] SKFLOW_AGENTS_CLI=$AgentsCli"
Write-Host '[set-skflow-env] Env vars set for current user. Restart shells / apps to inherit them.'
