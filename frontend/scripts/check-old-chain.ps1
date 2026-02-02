Param(
  [string]$OldChainId = "68113d35d4d4bccf55484cfdfe483955127740badafc80bdfc0621200f69004a",
  [string]$NewChainId = "8034b1b376dd64d049deec9bb3a74378502e9b2a6b1b370c5d1a510534e93b66"
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

$root = (Resolve-Path ".").Path
Write-Section "Project Root"
Write-Host $root

Write-Section "Environment Variables (current session)"
"VITE_BTC_CHAIN_ID = $($env:VITE_BTC_CHAIN_ID)"
"VITE_ETH_CHAIN_ID = $($env:VITE_ETH_CHAIN_ID)"
"VITE_BTC_TARGET_OWNER = $($env:VITE_BTC_TARGET_OWNER)"
"VITE_NATIVE_APPLICATION_ID = $($env:VITE_NATIVE_APPLICATION_ID)"
"VITE_Winza_APPLICATION_ID = $($env:VITE_Winza_APPLICATION_ID)"
"VITE_BTC_ENDPOINT = $($env:VITE_BTC_ENDPOINT)"
"VITE_ETH_ENDPOINT = $($env:VITE_ETH_ENDPOINT)"

Write-Section ".env files contents (normalized)"
function ShowEnvFile($path) {
  if (Test-Path $path) {
    Write-Host "- $path" -ForegroundColor Yellow
    Get-Content $path | ForEach-Object { $_.Trim() } | Where-Object { $_ -match "^VITE_" } | Write-Output
  } else {
    Write-Host "- $path (missing)" -ForegroundColor DarkGray
  }
}
ShowEnvFile "$root\.env"
ShowEnvFile "$root\.env.local"

Write-Section "Search for OLD chain id in workspace"
$files = Get-ChildItem -Path $root -Recurse -File |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\.git\\" }
$matches = @()
foreach ($f in $files) {
  try {
    $hit = Select-String -Path $f.FullName -Pattern $OldChainId -SimpleMatch -Quiet
    if ($hit) { $matches += $f.FullName }
  } catch {}
}
if ($matches.Count -gt 0) {
  Write-Host "Found references to OLD chain id in:" -ForegroundColor Red
  $matches | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
  Write-Host "No OLD chain id found in files (excluding node_modules/.git)" -ForegroundColor Green
}

Write-Section "Search in build output"
$dist = Join-Path $root "dist"
if (Test-Path $dist) {
  $distFiles = Get-ChildItem -Path $dist -Recurse -File
  $distMatches = @()
  foreach ($f in $distFiles) {
    try {
      $hit = Select-String -Path $f.FullName -Pattern $OldChainId -SimpleMatch -Quiet
      if ($hit) { $distMatches += $f.FullName }
    } catch {}
  }
  if ($distMatches.Count -gt 0) {
    Write-Host "OLD chain id present in dist:" -ForegroundColor Red
    $distMatches | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  } else {
    Write-Host "No OLD chain id found in dist" -ForegroundColor Green
  }
} else {
  Write-Host "dist folder missing; run 'npm run build' to check built assets" -ForegroundColor Yellow
}

Write-Section "Summary"
if ($matches.Count -gt 0 -or ($distMatches -and $distMatches.Count -gt 0)) {
  Write-Host "Action needed: Update or remove files shown above that still contain OLD chain id." -ForegroundColor Red
} else {
  Write-Host "Workspace and build are clean of OLD chain id. If logs still show origin=$OldChainId, source is external network process (validator/orchestrator)" -ForegroundColor Green
}

Write-Section "Hints"
Write-Host "- Delete or update .env.local if it contains old ids (it overrides .env)" -ForegroundColor Yellow
Write-Host "- Restart dev server after changes: npm run dev -- --port 5177" -ForegroundColor Yellow
Write-Host "- Clear browser cache/service worker for localhost to avoid stale env in bundle" -ForegroundColor Yellow

