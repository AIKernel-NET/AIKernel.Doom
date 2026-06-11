param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "WASM file not found: $Path"
}

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path))
if ($bytes.Length -lt 8) {
    Write-Error "WASM file is too small: $Path"
}

$magic = [byte[]](0x00, 0x61, 0x73, 0x6d)
for ($i = 0; $i -lt $magic.Length; $i++) {
    if ($bytes[$i] -ne $magic[$i]) {
        Write-Error "Invalid WASM magic header: $Path"
    }
}

$version = [byte[]](0x01, 0x00, 0x00, 0x00)
for ($i = 0; $i -lt $version.Length; $i++) {
    if ($bytes[$i + 4] -ne $version[$i]) {
        Write-Error "Unsupported WASM binary version: $Path"
    }
}

Write-Host "Verified WASM binary: $Path"
