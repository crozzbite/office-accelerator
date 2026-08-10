# Scope B smoke — assert Office* set, no packs, YAML loadable.
# Precedence: SKFLOW_ROOT env → dist/legion-neutral → out/legion-neutral

$ErrorActionPreference = "Stop"

$AccelRoot = Split-Path -Parent $PSScriptRoot
$DistSkflow = Join-Path $AccelRoot "dist\legion-neutral"
$OutSkflow = Join-Path $AccelRoot "out\legion-neutral"

function Resolve-DefaultSkflow {
  if (Test-Path (Join-Path $DistSkflow "manifests")) { return $DistSkflow }
  if (Test-Path (Join-Path $OutSkflow "manifests")) { return $OutSkflow }
  return $DistSkflow
}

$SkflowRoot = if ($env:SKFLOW_ROOT -and $env:SKFLOW_ROOT.Trim()) {
  [System.IO.Path]::GetFullPath($env:SKFLOW_ROOT.Trim())
} else {
  [System.IO.Path]::GetFullPath((Resolve-DefaultSkflow))
}

$Expected = @(
  "OfficeFacade", "OfficePmo", "OfficeScope", "OfficeArchitecture",
  "OfficeExperience", "OfficeEngineering", "OfficeQuality",
  "OfficeDeploy", "OfficeProduction", "OfficeImprove"
) | Sort-Object

$ManifestDir = Join-Path $SkflowRoot "manifests"
if (-not (Test-Path $ManifestDir)) {
  Write-Error "FAIL: manifests not found under $SkflowRoot (run scripts/promote-legion-neutral.ps1)"
}

$Ids = Get-ChildItem $ManifestDir -Filter "*.yaml" | ForEach-Object { $_.BaseName } | Sort-Object

$Missing = Compare-Object $Expected $Ids -PassThru | Where-Object { $_ -in $Expected }
$Extra = Compare-Object $Expected $Ids -PassThru | Where-Object { $_ -notin $Expected }
if ($Missing) { Write-Error "FAIL: missing ids: $($Missing -join ', ')" }
if ($Extra) { Write-Error "FAIL: unexpected ids: $($Extra -join ', ')" }

$LegacyHit = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern "experto_|PackLich|PackGentleman|PackCerbero|centinela_cerbero"
if ($LegacyHit) { Write-Error "FAIL: branded/legacy pack markers in manifests" }

$PackTrue = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern "personality_pack_default:\s*true"
if ($PackTrue) { Write-Error "FAIL: personality_pack_default true found" }

$AbsHit = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern 'C:\\Users\\|C:/Users/'
if ($AbsHit) { Write-Error "FAIL: absolute user paths in manifests" }

Write-Host "PASS: Office* set ($($Ids.Count)) under $SkflowRoot"
Write-Host "PASS: no experto_*/branded packs; personality_pack_default false"

$AgentsRoot = Join-Path (Split-Path -Parent $AccelRoot) "SkullRender-Agents"
if ((Test-Path (Join-Path $AgentsRoot "src\agents-manager.ts")) -and (Get-Command bun -ErrorAction SilentlyContinue)) {
  $env:SKFLOW_ROOT = $SkflowRoot
  Push-Location $AgentsRoot
  try {
    & bun -e "import { AgentsManager } from './src/agents-manager.ts'; const n = new AgentsManager(process.env.SKFLOW_ROOT).loadAll().size; if (n !== 10) { console.error('FAIL: loadAll='+n); process.exit(1); } console.log('PASS: AgentsManager loadAll=10');"
    if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: YAML load gate" }
  } finally { Pop-Location }
} else {
  Write-Host "SKIP: AgentsManager load gate (bun/Agents sibling missing)"
}

Write-Host "POLICY: inject_pack false; do not use skflow_packs_* as SoT"
Write-Host "DUAL-ROOT: Capa A alone = no offices MCP (expected)."
