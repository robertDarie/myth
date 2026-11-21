# Isolated launcher for the 2026-11-21 Windows release candidate.
# Starts the packaged server on a disposable JSON save. It never calls
# "Start Thrones of Myth.cmd", which would use port 8080 and the production save.
param(
  [int]$Port = 8110,
  [string]$PackageRoot = ""
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $PackageRoot) { $PackageRoot = Join-Path $repo 'dist\ReleaseCandidate20261121' }
$PackageRoot = [IO.Path]::GetFullPath($PackageRoot)
$save = [IO.Path]::GetFullPath((Join-Path $repo 'work\rc-kingdom\world.json'))
$productionDir = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'ThronesOfMyth\Saves'))
if ($save.StartsWith($productionDir, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to start: $save is inside the production save directory."
}
if ($Port -eq 8095 -or $Port -eq 8080) {
  throw "Refusing port $Port. Use a disposable port. 8080 is the production launcher port and 8095 is reserved."
}
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) { throw "Port $Port is already listening. A second server was not started." }
$node = Join-Path $PackageRoot 'Runtime\node.exe'
$entry = Join-Path $PackageRoot 'Server\index.mjs'
$game = Join-Path $PackageRoot 'Game\ThronesOfMyth.exe'
$manifestPath = Join-Path $PackageRoot 'manifest.json'
foreach ($required in @($node, $entry, $game, $manifestPath)) {
  if (-not (Test-Path -LiteralPath $required)) { throw "Package file missing: $required. Extract dist\Thrones-of-Myth-ReleaseCandidate20261121.zip without replacing older ZIPs." }
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.dirty) { throw 'Refusing a dirty source package.' }
New-Item -ItemType Directory -Force -Path (Split-Path $save) | Out-Null
Write-Output "Package commit: $($manifest.commit)"
Write-Output "Isolated save: $save"
Write-Output "Production directory left untouched: $productionDir"
$previous = @{
  THRONES_SAVE_PATH = $env:THRONES_SAVE_PATH
  THRONES_BUILD_VERSION = $env:THRONES_BUILD_VERSION
  THRONES_BUILD_COMMIT = $env:THRONES_BUILD_COMMIT
  THRONES_SERVER_DIGEST = $env:THRONES_SERVER_DIGEST
  THRONES_LAUNCH_TOKEN = $env:THRONES_LAUNCH_TOKEN
}
$token = [Guid]::NewGuid().ToString('N')
$env:THRONES_SAVE_PATH = $save
$env:THRONES_BUILD_VERSION = [string]$manifest.version
$env:THRONES_BUILD_COMMIT = [string]$manifest.commit
$env:THRONES_SERVER_DIGEST = [string]$manifest.serverDigest
$env:THRONES_LAUNCH_TOKEN = $token
Remove-Item Env:THRONES_DB_PATH -ErrorAction SilentlyContinue
Remove-Item Env:THRONES_REALMS -ErrorAction SilentlyContinue
$logDir = Join-Path $repo 'work\rc-kingdom'
$server = Start-Process -FilePath $node -ArgumentList @("`"$entry`"", '--local-playtest', "--local-port=$Port") -WorkingDirectory $PackageRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server.err')
try {
  $health = $null
  for ($attempt = 0; $attempt -lt 80; $attempt++) {
    if ($server.HasExited) { throw "Packaged server exited. See $logDir\server.err" }
    try { $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2 } catch { $health = $null }
    if ($health -and $health.game -eq 'thrones-of-myth' -and $health.version -eq 17 -and $health.build.commit -eq $manifest.commit) { break }
    Start-Sleep -Milliseconds 100
  }
  if (-not $health -or $health.build.commit -ne $manifest.commit) { throw 'The packaged server did not become ready with this package commit.' }
  Write-Output "Server ready at http://127.0.0.1:$Port protocol $($health.version)"
  $client = Start-Process -FilePath $game -ArgumentList @('--thrones-server', "http://127.0.0.1:$Port") -WorkingDirectory (Split-Path $game) -PassThru
  $client.WaitForExit()
}
finally {
  if ($server -and -not $server.HasExited) {
    try {
      Invoke-RestMethod -Uri "http://127.0.0.1:$Port/launcher-shutdown" -Method Post -Headers @{ 'X-Thrones-Launcher' = $token } -TimeoutSec 5 | Out-Null
      $server.WaitForExit(5000) | Out-Null
    } catch { }
    if (-not $server.HasExited) { $server.Kill(); $server.WaitForExit() }
  }
  foreach ($name in $previous.Keys) {
    if ($null -eq $previous[$name]) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
    else { Set-Item "Env:$name" $previous[$name] }
  }
}
