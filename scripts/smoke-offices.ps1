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

# Core Saep/spine set is mandatory. Sae ids (OfficeSae*) are optional: present only
# when the tree was scaffolded from a cookbook that declares a sae roster.
$Core = @(
  "OfficeFacade", "OfficePmo", "OfficeScope", "OfficeArchitecture",
  "OfficeExperience", "OfficeEngineering", "OfficeQuality",
  "OfficeDeploy", "OfficeProduction", "OfficeImprove"
) | Sort-Object

$ManifestDir = Join-Path $SkflowRoot "manifests"
if (-not (Test-Path $ManifestDir)) {
  Write-Error "FAIL: manifests not found under $SkflowRoot (run scripts/promote-legion-neutral.ps1)"
}

$Ids = Get-ChildItem $ManifestDir -Filter "*.yaml" | ForEach-Object { $_.BaseName } | Sort-Object

$MissingCore = $Core | Where-Object { $_ -notin $Ids }
if ($MissingCore) { Write-Error "FAIL: missing core ids: $($MissingCore -join ', ')" }

$SaeIds = @($Ids | Where-Object { $_ -like "OfficeSae*" })
$Unexpected = $Ids | Where-Object { $_ -notin $Core -and $_ -notin $SaeIds }
if ($Unexpected) { Write-Error "FAIL: unexpected ids: $($Unexpected -join ', ')" }

foreach ($Sae in $SaeIds) {
  $SaeFile = Join-Path $ManifestDir "$Sae.yaml"
  if (-not (Select-String -Path $SaeFile -Pattern '^office:\s*"?sae"?\s*$' -Quiet)) {
    Write-Error "FAIL: $Sae is named as a Sae but does not declare office: sae"
  }
  $Parent = (Select-String -Path $SaeFile -Pattern '^reports_to:\s*"?([A-Za-z0-9_]+)"?\s*$').Matches.Groups[1].Value
  if (-not $Parent -or $Parent -notin $Core -or $Parent -eq "OfficePmo" -or $Parent -eq "OfficeFacade") {
    Write-Error "FAIL: $Sae reports to '$Parent'; a Sae must report to a stage office"
  }
  if (Select-String -Path $SaeFile -Pattern '^\s+-\s+Task\s*$' -Quiet) {
    Write-Error "FAIL: $Sae holds the Task tool (Saes must not re-delegate)"
  }
}

$LegacyHit = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern "experto_|PackLich|PackGentleman|PackCerbero|centinela_cerbero"
if ($LegacyHit) { Write-Error "FAIL: branded/legacy pack markers in manifests" }

$PackTrue = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern "personality_pack_default:\s*true"
if ($PackTrue) { Write-Error "FAIL: personality_pack_default true found" }

$AbsHit = Select-String -Path (Join-Path $ManifestDir "*.yaml") -Pattern 'C:\\Users\\|C:/Users/'
if ($AbsHit) { Write-Error "FAIL: absolute user paths in manifests" }

# Whole SKFLOW tree (yaml + json + md): catch scaffold-meta.json and siblings.
$TreeHits = Get-ChildItem -Path $SkflowRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -match '\.(ya?ml|json|md|txt|mdc)$' } |
  Select-String -Pattern 'C:\\Users\\|C:/Users/'
if ($TreeHits) {
  $paths = $TreeHits | ForEach-Object { $_.Path } | Sort-Object -Unique
  Write-Error "FAIL: absolute user paths in SKFLOW tree: $($paths -join ', ')"
}

Write-Host "PASS: core Office* set (10) + $($SaeIds.Count) Sae under $SkflowRoot"
Write-Host "PASS: no experto_*/branded packs; personality_pack_default false"

$AgentsRoot = Join-Path (Split-Path -Parent $AccelRoot) "SkullRender-Agents"
if ((Test-Path (Join-Path $AgentsRoot "src\agents-manager.ts")) -and (Get-Command bun -ErrorAction SilentlyContinue)) {
  $env:SKFLOW_ROOT = $SkflowRoot
  $env:SKFLOW_EXPECTED = $Ids.Count
  Push-Location $AgentsRoot
  try {
    # loadAll also rejects a Sae whose reports_to is missing or is not a Saep.
    & bun -e "import { AgentsManager } from './src/agents-manager.ts'; const want = Number(process.env.SKFLOW_EXPECTED); const n = new AgentsManager(process.env.SKFLOW_ROOT).loadAll().size; if (n !== want) { console.error('FAIL: loadAll='+n+' want='+want); process.exit(1); } console.log('PASS: AgentsManager loadAll='+n);"
    if ($LASTEXITCODE -ne 0) { Write-Error "FAIL: YAML load gate" }
  } finally { Pop-Location }
} else {
  Write-Host "SKIP: AgentsManager load gate (bun/Agents sibling missing)"
}

Write-Host "POLICY: inject_pack false; do not use skflow_packs_* as SoT"
Write-Host "DUAL-ROOT: Capa A alone = no offices MCP (expected)."
