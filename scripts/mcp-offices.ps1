# Scope B — start offices MCP without hardcoded machine paths.
# Precedence:
#   1) env SKFLOW_ROOT
#   2) <accelerator>/dist/legion-neutral  (shipped B2)
#   3) <accelerator>/out/legion-neutral   (local scaffold)
# Agents CLI: env SKFLOW_AGENTS_CLI else sibling ../SkullRender-Agents/bundle/cli.js

$ErrorActionPreference = "Stop"

$AccelRoot = Split-Path -Parent $PSScriptRoot
$DistSkflow = Join-Path $AccelRoot "dist\legion-neutral"
$OutSkflow = Join-Path $AccelRoot "out\legion-neutral"
$ParentRoot = Split-Path -Parent $AccelRoot
$DefaultAgentsCli = Join-Path $ParentRoot "SkullRender-Agents\bundle\cli.js"

function Resolve-DefaultSkflow {
  if (Test-Path (Join-Path $DistSkflow "manifests")) { return $DistSkflow }
  if (Test-Path (Join-Path $OutSkflow "manifests")) { return $OutSkflow }
  return $DistSkflow
}

if ($env:SKFLOW_ROOT -and $env:SKFLOW_ROOT.Trim().Length -gt 0) {
  $SkflowRoot = [System.IO.Path]::GetFullPath($env:SKFLOW_ROOT.Trim())
} else {
  $SkflowRoot = [System.IO.Path]::GetFullPath((Resolve-DefaultSkflow))
}

if ($env:SKFLOW_AGENTS_CLI -and $env:SKFLOW_AGENTS_CLI.Trim().Length -gt 0) {
  $AgentsCli = [System.IO.Path]::GetFullPath($env:SKFLOW_AGENTS_CLI.Trim())
} else {
  $AgentsCli = [System.IO.Path]::GetFullPath($DefaultAgentsCli)
}

if (-not (Test-Path -LiteralPath (Join-Path $SkflowRoot "manifests"))) {
  Write-Error "SKFLOW_ROOT missing manifests/: $SkflowRoot (run scripts/promote-legion-neutral.ps1 or set SKFLOW_ROOT)"
}
if (-not (Test-Path -LiteralPath $AgentsCli)) {
  Write-Error "Agents CLI not found: $AgentsCli (clone SkullRender-Agents as sibling or set SKFLOW_AGENTS_CLI)"
}

$env:SKFLOW_ROOT = $SkflowRoot
Write-Host "[mcp-offices] SKFLOW_ROOT=$SkflowRoot"
Write-Host "[mcp-offices] AgentsCli=$AgentsCli (inject_pack must stay false)"

& node $AgentsCli mcp --root $SkflowRoot
