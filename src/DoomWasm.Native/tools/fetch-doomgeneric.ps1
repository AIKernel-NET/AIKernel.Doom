param(
    [string]$Repository = "https://github.com/ozkl/doomgeneric.git",
    [Parameter(Mandatory = $true)]
    [string]$Commit,
    [string]$Destination = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
if ([string]::IsNullOrWhiteSpace($Destination)) {
    $Destination = Join-Path $ProjectDir "third_party\doomgeneric"
}

if (Test-Path -LiteralPath $Destination) {
    Write-Host "doomgeneric already exists: $Destination"
} else {
    git clone $Repository $Destination
}

git -C $Destination fetch --tags --prune
git -C $Destination checkout $Commit
git -C $Destination submodule update --init --recursive

$PatchPath = Join-Path $ProjectDir "patches\doomgeneric-upstream.patch"
if (Test-Path -LiteralPath $PatchPath) {
    git -C $Destination apply --check --whitespace=nowarn $PatchPath 2>$null
    if ($LASTEXITCODE -eq 0) {
        git -C $Destination apply --whitespace=nowarn $PatchPath
        Write-Host "Applied AIKernel doomgeneric patch: $PatchPath"
    } else {
        Write-Host "AIKernel doomgeneric patch already applied or not applicable: $PatchPath"
    }
}
