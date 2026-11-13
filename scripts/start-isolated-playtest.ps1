# Isolated Thrones of Myth playtest server.
# Uses work\playtest-save\world.json. Never opens %LOCALAPPDATA%\ThronesOfMyth\Saves.
param(
  [int]$Port = 8091,
  [string]$SeedFrom = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$saveDir = Join-Path $root "work\playtest-save"
$save = Join-Path $saveDir "world.json"
$real = Join-Path $env:LOCALAPPDATA "ThronesOfMyth\Saves\world.json"
if ([IO.Path]::GetFullPath($save) -eq [IO.Path]::GetFullPath($real)) {
  throw "Refusing to start: the isolated path resolved to the real kingdom save."
}
New-Item -ItemType Directory -Force -Path $saveDir | Out-Null
if ($SeedFrom) {
  $seed = (Resolve-Path $SeedFrom).Path
  if ([IO.Path]::GetFullPath($seed) -eq [IO.Path]::GetFullPath($real)) {
    throw "Refusing to seed from the real kingdom save."
  }
  if (Test-Path $save) {
    throw "work\playtest-save\world.json already exists. The seed was not copied."
  }
  Copy-Item -Force $seed $save
}
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  throw "Port $Port is already listening. A second server was not started against this save."
}
$env:THRONES_SAVE_PATH = $save
Write-Output "Isolated save: $save"
Write-Output "Player: dist\Windows\Game\ThronesOfMyth.exe --thrones-server http://127.0.0.1:$Port"
node (Join-Path $root "server\index.mjs") --local-playtest "--local-port=$Port"
