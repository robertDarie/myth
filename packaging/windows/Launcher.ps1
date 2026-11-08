param([switch]$ProfileVisuals)
# Runs only the local prototype server started by this launcher. No admin access required.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$packageRoot = $PSScriptRoot
$ownedServer = $null
$lockTaken = $false
$shutdownToken = [Guid]::NewGuid().ToString('N')
$launcherMutex = New-Object System.Threading.Mutex($false, 'Local\ThronesOfMythPrototypeLauncher')
function Show-Error([string]$message) {
    [System.Windows.Forms.MessageBox]::Show($message, 'Thrones of Myth', 'OK', 'Error') | Out-Null
}
function Get-LocalServer {
    try { return Invoke-RestMethod -Uri 'http://127.0.0.1:8080/health' -TimeoutSec 1 -ErrorAction Stop }
    catch { return $null }
}
function Is-Compatible($health) {
    return $null -ne $health -and $health.game -eq 'thrones-of-myth' -and $health.version -eq 15
}
try {
    try { $lockTaken = $launcherMutex.WaitOne(0) }
    catch [System.Threading.AbandonedMutexException] { $lockTaken = $true }
    if (-not $lockTaken) { throw 'The packaged playtest is already running. Switch to its game window.' }
    $gameExe = Join-Path $packageRoot 'Game\ThronesOfMyth.exe'
    $nodeExe = Join-Path $packageRoot 'Runtime\node.exe'
    $serverEntry = Join-Path $packageRoot 'Server\index.mjs'
    foreach ($required in @($gameExe, $nodeExe, $serverEntry)) {
        if (-not (Test-Path -LiteralPath $required)) { throw "Package file missing: $required. Extract the entire ZIP or reinstall the playtest." }
    }
    $health = Get-LocalServer
    if ($null -ne $health -and -not (Is-Compatible $health)) {
        throw 'Port 8080 is used by an incompatible server. Stop the older prototype server and launch again.'
    }
    if (-not (Is-Compatible $health)) {
        $logDirectory = Join-Path $env:LOCALAPPDATA 'ThronesOfMyth\Logs'
        New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
        $previousToken = $env:THRONES_LAUNCH_TOKEN
        try {
            $env:THRONES_LAUNCH_TOKEN = $shutdownToken
        $ownedServer = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $serverEntry + '"'), '--local-playtest') -WorkingDirectory $packageRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'server.log') -RedirectStandardError (Join-Path $logDirectory 'server-error.log')
        } finally { $env:THRONES_LAUNCH_TOKEN = $previousToken }

        for ($attempt = 0; $attempt -lt 80; $attempt++) {
            if ($ownedServer.HasExited) { throw "The local server could not start. Check $logDirectory\server-error.log. Another program may be using port 8080." }
            $health = Get-LocalServer
            if (Is-Compatible $health) { break }
            Start-Sleep -Milliseconds 100
        }
        if (-not (Is-Compatible $health)) { throw 'The local server did not become ready. Check the server logs in LocalAppData\ThronesOfMyth\Logs.' }
    }
    if ($ProfileVisuals) { $game = Start-Process -FilePath $gameExe -ArgumentList '--thrones-profile' -WorkingDirectory (Split-Path $gameExe) -PassThru }
    else { $game = Start-Process -FilePath $gameExe -WorkingDirectory (Split-Path $gameExe) -PassThru }
    $game.WaitForExit()
}
catch { Show-Error $_.Exception.Message; exit 1 }
finally {
    if ($null -ne $ownedServer) {
        if (-not $ownedServer.HasExited) {
            try {
                Invoke-RestMethod -Uri 'http://127.0.0.1:8080/launcher-shutdown' -Method Post -Headers @{ 'X-Thrones-Launcher' = $shutdownToken } -TimeoutSec 5 | Out-Null
                $ownedServer.WaitForExit(5000) | Out-Null
            } catch { Show-Error 'The server could not close cleanly. Progress should be available from its most recent autosave.' }
            if (-not $ownedServer.HasExited) { $ownedServer.Kill(); $ownedServer.WaitForExit() }
        }
        $ownedServer.Dispose()
    }
    if ($lockTaken) { $launcherMutex.ReleaseMutex() }
    $launcherMutex.Dispose()
}
