param(
    [string]$UnityEditor = "$env:ProgramFiles\Unity\Hub\Editor\6000.3.0f1\Editor\Unity.exe",
    [switch]$SkipUnity
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot 'client'
$reports = Join-Path $repoRoot 'work\native-visual-review'
New-Item -ItemType Directory -Force -Path $reports | Out-Null
Push-Location $repoRoot
try {
    & npm.cmd --prefix server test
    if ($LASTEXITCODE -ne 0) { throw 'Server regressions failed.' }
    $portableState = 'pending: .NET 8 SDK unavailable'
    if (Get-Command dotnet -ErrorAction SilentlyContinue) {
        & dotnet run --project tests/PresentationContracts -c Release
        if ($LASTEXITCODE -ne 0) { throw 'Presentation contracts failed.' }
        $portableState = 'passed'
    }
    $nativeState = 'pending: skipped or Unity unavailable'
    if (-not $SkipUnity) {
        if (-not (Test-Path -LiteralPath $UnityEditor)) { throw "Unity Editor not found: $UnityEditor. Supply -UnityEditor or explicitly use -SkipUnity." }
        $started = [DateTime]::UtcNow
        $log = Join-Path $reports 'headless-unity.log'
        & $UnityEditor -batchmode -nographics -projectPath $project -executeMethod ThronesOfMyth.Editor.VisualAcceptanceReview.ValidateHeadless -quit -logFile $log
        if ($LASTEXITCODE -ne 0) { throw "Unity compilation/geometry/import checks failed. See $log" }
        foreach ($file in @('camera-boundaries.json', 'headless-contracts.json')) {
            $path = Join-Path $reports $file
            if (-not (Test-Path $path)) { throw "Missing native report: $path" }
            $info = Get-Item $path
            $result = Get-Content -Raw $path | ConvertFrom-Json
            if ($info.LastWriteTimeUtc -lt $started -or -not $result.success) { throw "Failed or stale native report: $path" }
        }
        $nativeState = 'passed: compilation, camera geometry and imports only'
    }
    $matrix = Join-Path $reports 'acceptance-matrix.csv'
    if (-not (Test-Path $matrix)) {
        $cases = @('World edges/corners and zoom', 'Boundary focus and ground picking', 'Fog and hidden-object privacy', 'Worksites/mixed formations/gathering', 'City rotation/building states/completion', 'Menu and every destination', 'Training/research/commanders/inventory', 'Errors/retry/reduced motion', 'Captain mixed patrol and real Forsaken Scouts skill', 'Known camp approach and fog privacy', 'Rally shield exhaustion and pooling', 'Navigation labels and tooltip dismissal')
        $rows = foreach ($resolution in @('1200x720','1280x720','1366x768','1600x900','1920x1080','2560x1440','1024x768','2560x1080')) {
            foreach ($scale in @(85,100,115)) {
                foreach ($case in $cases) { [pscustomobject]@{resolution=$resolution;uiScale=$scale;scenario=$case;status='PENDING';notes=''} }
            }
        }
        $rows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $matrix
    }
    [pscustomobject]@{
        server='passed';portableContracts=$portableState;nativeContracts=$nativeState
        rendering='PENDING';input='PENDING';standalonePerformance='PENDING'
    } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $reports 'windows-validation-summary.json')
    Write-Host "Checks complete. Rendered acceptance remains pending: $matrix"
} finally { Pop-Location }
