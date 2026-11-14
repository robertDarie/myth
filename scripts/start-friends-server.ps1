param(
    [int]$Port = 8088,
    [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA 'ThronesOfMyth\FriendsAlpha'),
    [string]$RealmFile = '',
    [switch]$TrustLocalProxy
)
$ErrorActionPreference = 'Stop'
if ($Port -lt 1 -or $Port -gt 65535 -or $Port -eq 8091) { throw 'Choose a valid port other than the isolated playtest port 8091.' }
$root = Split-Path -Parent $PSScriptRoot
$alphaData = [IO.Path]::GetFullPath($DataDirectory).TrimEnd('\','/')
$protected = @((Join-Path $env:LOCALAPPDATA 'ThronesOfMyth\Saves'), (Join-Path $root 'work\playtest-save'))
foreach ($path in $protected) {
    $resolved = [IO.Path]::GetFullPath($path).TrimEnd('\','/')
    if ($alphaData.Equals($resolved,[StringComparison]::OrdinalIgnoreCase) -or $alphaData.StartsWith($resolved+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Friends alpha data must be separate from real and isolated playtest saves.' }
}
if (!$RealmFile -and [string]::IsNullOrWhiteSpace($env:THRONES_JOIN_CODE)) { throw 'Set THRONES_JOIN_CODE to a private invitation code before starting.' }
if ($RealmFile) {
    $RealmFile = (Resolve-Path -LiteralPath $RealmFile).Path
    $config = Get-Content -LiteralPath $RealmFile -Raw | ConvertFrom-Json
    if (!$config.kingdoms -or $config.kingdoms.Count -gt 4) { throw 'Choose one to four configured kingdoms.' }
    foreach ($realm in $config.kingdoms) {
        if((!$realm.savePath -and !$realm.databasePath) -or ($realm.savePath -and $realm.databasePath)){throw 'Each friends kingdom must choose exactly one persistent JSON or SQLite path.'}
        if ([string]::IsNullOrWhiteSpace($realm.joinCode) -and [string]::IsNullOrWhiteSpace($env:THRONES_JOIN_CODE)) { throw 'Every kingdom needs an invitation code.' }
        foreach ($path in @($realm.savePath,$realm.databasePath) | Where-Object { $_ }) {
            $target = if ([IO.Path]::IsPathRooted($path)) { [IO.Path]::GetFullPath($path) } else { [IO.Path]::GetFullPath((Join-Path $root $path)) }
            foreach($pathToProtect in $protected){$safe=[IO.Path]::GetFullPath($pathToProtect).TrimEnd('\','/');if($target.Equals($safe,[StringComparison]::OrdinalIgnoreCase)-or $target.StartsWith($safe+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Realm configuration points at a protected player save.'}}
            if (!$target.StartsWith($alphaData+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Friends realm storage must stay inside the selected alpha data directory.' }
        }
    }
}
$node = (Get-Command node -ErrorAction Stop).Source
if ([int]((& $node --version).TrimStart('v').Split('.')[0]) -lt 24) { throw 'The host needs Node.js 24 or later. Friends do not need Node.' }
New-Item -ItemType Directory -Path $alphaData -Force | Out-Null
$keys = @('HOST','PORT','THRONES_DB_PATH','THRONES_REALMS','THRONES_KINGDOM_ID','THRONES_TRUST_PROXY','THRONES_CITY_CAPACITY','THRONES_BUILD_VERSION','THRONES_BUILD_COMMIT','THRONES_SERVER_DIGEST','THRONES_METRICS_PATH')
$saved = @{}
foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key,'Process') }
Push-Location -LiteralPath $root
try {
    $env:HOST = '127.0.0.1'; $env:PORT = [string]$Port
    $env:THRONES_DB_PATH = Join-Path $alphaData 'friends.sqlite'
    $env:THRONES_REALMS = $RealmFile; $env:THRONES_KINGDOM_ID = 'friends'
    $env:THRONES_TRUST_PROXY = if ($TrustLocalProxy) { '1' } else { '0' }
    $env:THRONES_CITY_CAPACITY = '32'; $env:THRONES_METRICS_PATH = ''
    $env:THRONES_BUILD_VERSION = '0.45.0'
    $env:THRONES_BUILD_COMMIT = (& git -C $root rev-parse HEAD).Trim()
    $env:THRONES_SERVER_DIGEST = ''
    Write-Host "Dedicated alpha: http://127.0.0.1:$Port  (private HTTPS proxy connects here)"
    Write-Host 'The server remains independent of every client. Keep this terminal/host online; Ctrl+C stops safely.'
    & $node (Join-Path $root 'server\index.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Dedicated server exited with code $LASTEXITCODE." }
} finally {
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key,$saved[$key],'Process') }
    Pop-Location
}
