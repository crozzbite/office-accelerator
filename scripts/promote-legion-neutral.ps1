# Promote local scaffold out/legion-neutral → dist/legion-neutral (shipped B2 product).
# No machine user paths. Run from office-accelerator root or via this script path.

$ErrorActionPreference = "Stop"
$AccelRoot = Split-Path -Parent $PSScriptRoot
$Src = Join-Path $AccelRoot "out\legion-neutral"
$Dest = Join-Path $AccelRoot "dist\legion-neutral"

if (-not (Test-Path (Join-Path $Src "manifests"))) {
  Write-Host "Scaffold missing; generating out/legion-neutral…"
  Push-Location $AccelRoot
  try {
    bun run scaffold -- --params params.vsc-neutral.yaml --cookbook sdlc-8-stages --out ./out/legion-neutral
  } finally {
    Pop-Location
  }
}

if (Test-Path $Dest) {
  Remove-Item -Recurse -Force $Dest
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# Ship: manifests + schemas + meta. Skip .cursor (Cursor residue, not Copilot SoT).
Copy-Item -Recurse (Join-Path $Src "manifests") (Join-Path $Dest "manifests")
Copy-Item -Recurse (Join-Path $Src "schemas") (Join-Path $Dest "schemas")
if (Test-Path (Join-Path $Src "scaffold-meta.json")) {
  Copy-Item (Join-Path $Src "scaffold-meta.json") (Join-Path $Dest "scaffold-meta.json")
}
if (Test-Path (Join-Path $Src "RULES.BYO.md")) {
  Copy-Item (Join-Path $Src "RULES.BYO.md") (Join-Path $Dest "RULES.BYO.md")
}

@"
# Shipped Scope B offices (pack-free)

Generated from ``params.vsc-neutral.yaml`` + cookbook ``sdlc-8-stages``.

- Ids: ``OfficeFacade``, ``OfficePmo``, ``OfficeScope``, … ``OfficeImprove``
- ``personality_pack_default: false`` on all offices
- Runtime: sibling [SkullRender-Agents](https://github.com/crozzbite/SkullRender-Agents) with ``inject_pack: false``
- Governance (Capa A): [WorkDesktop ``governance/vscode-copilot-ready``](https://github.com/crozzbite/WorkDesktop/tree/governance/vscode-copilot-ready)

Do not treat ``.cursor/`` from local ``out/`` scaffolds as Copilot SoT.
"@ | Set-Content -Encoding utf8 (Join-Path $Dest "README.md")

Write-Host "Promoted → $Dest"
Get-ChildItem (Join-Path $Dest "manifests") | Measure-Object | ForEach-Object { Write-Host "manifests: $($_.Count)" }
