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
