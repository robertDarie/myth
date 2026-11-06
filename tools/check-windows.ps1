$ErrorActionPreference = 'Stop'
Write-Host 'Thrones of Myth: local prerequisites'
foreach ($tool in @('git', 'node', 'npm')) {
    if (Get-Command $tool -ErrorAction SilentlyContinue) {
        Write-Host "[OK] $tool found"
    } else {
        Write-Host "[MISSING] $tool - see docs/windows-setup.md"
    }
}
if (Get-Command git -ErrorAction SilentlyContinue) {
    git lfs version
    if ($LASTEXITCODE -ne 0) { Write-Host '[MISSING] Git LFS' }
}
$hubPath = Join-Path $env:ProgramFiles 'Unity Hub\Unity Hub.exe'
if (Test-Path $hubPath) { Write-Host '[OK] Unity Hub found' }
else { Write-Host '[INFO] Unity Hub not found at its default location' }
Write-Host 'In Unity Hub, confirm Unity 6.3 LTS is installed and licensed.'
