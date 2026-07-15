param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    [string]$WebsitePublicRoot = ""
)

$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "DoomControlBrowser.csproj"
$doomWebRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\DoomWeb\wwwroot"))

dotnet publish $project --no-restore -c $Configuration
if ($LASTEXITCODE -ne 0) {
    throw "DoomControlBrowser publish failed with exit code $LASTEXITCODE."
}

$bundle = Join-Path $PSScriptRoot "bin\$Configuration\net10.0\browser-wasm\AppBundle"
if (-not (Test-Path -LiteralPath $bundle -PathType Container)) {
    throw "DoomControlBrowser AppBundle was not generated: $bundle"
}

$destinations = @(
    (Join-Path $doomWebRoot "demo\doom\csharp-control")
)
if (-not [string]::IsNullOrWhiteSpace($WebsitePublicRoot)) {
    $websiteRoot = [System.IO.Path]::GetFullPath($WebsitePublicRoot)
    $destinations += Join-Path $websiteRoot "demo\doom\csharp-control"
}

foreach ($destination in $destinations) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Copy-Item -Path (Join-Path $bundle "*") -Destination $destination -Recurse -Force
    Write-Output "Staged C# FirstDoor AppBundle: $destination"
}
