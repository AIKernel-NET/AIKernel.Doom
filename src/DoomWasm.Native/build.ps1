param(
    [string]$Output = "",
    [string]$DoomGenericDir = "",
    [string]$Emcc = "emcc"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($Output)) {
    $Output = Join-Path $ProjectDir "..\..\samples\doom.wasm"
}
if ([string]::IsNullOrWhiteSpace($DoomGenericDir)) {
    $DoomGenericDir = Join-Path $ProjectDir "third_party\doomgeneric\doomgeneric"
}

$emccCommand = Get-Command $Emcc -ErrorAction SilentlyContinue
if ($null -eq $emccCommand) {
    Write-Error "emcc not found. Install and activate Emscripten, or run dotnet build without BuildDoomWasm=true."
}
if (-not (Test-Path -LiteralPath $DoomGenericDir)) {
    Write-Error "doomgeneric source missing: $DoomGenericDir. Run tools/fetch-doomgeneric.ps1 with a pinned commit."
}

$overlay = @(
    "src\aik_doom_abi.c",
    "src\aik_doom_wad.c",
    "src\aik_doom_input.c",
    "src\aik_doom_time.c",
    "src\aik_doom_log.c",
    "src\aik_doom_wad_file.c",
    "src\aik_doom_sound.c",
    "src\doomgeneric_aikernel.c"
) | ForEach-Object { Join-Path $ProjectDir $_ }

$excludedUpstreamSources = @(
    "doomgeneric_allegro.c",
    "doomgeneric_emscripten.c",
    "doomgeneric_linuxvt.c",
    "doomgeneric_sdl.c",
    "doomgeneric_soso.c",
    "doomgeneric_sosox.c",
    "doomgeneric_win.c",
    "doomgeneric_xlib.c",
    "i_allegromusic.c",
    "i_allegrosound.c",
    "i_cdmus.c",
    "i_sdlmusic.c",
    "i_sdlsound.c",
    "w_file.c",
    "w_file_stdc.c"
)

$doomSources = Get-ChildItem -LiteralPath $DoomGenericDir -Filter "*.c" -File |
    Where-Object { $excludedUpstreamSources -notcontains $_.Name } |
    ForEach-Object { $_.FullName }
$exports = '["_main","_doom_init","_doom_tick","_doom_render","_doom_input","_doom_input_action","_doom_mount_wad","_doom_wad_status","_doom_audio_status","_doom_audio_sample_rate","_doom_audio_channels","_doom_audio_buffer","_doom_audio_capacity_frames","_doom_audio_read_offset_frames","_doom_audio_available_frames","_doom_audio_consume_frames","_doom_audio_event_count","_malloc","_free"]'
$include = Join-Path $ProjectDir "include"
$outDir = Split-Path -Parent $Output
if (-not [string]::IsNullOrWhiteSpace($outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

& $emccCommand.Source `
    "-O3" `
    "-sWASM=1" `
    "-sSTANDALONE_WASM=1" `
    "-sFILESYSTEM=0" `
    "-sEXPORTED_FUNCTIONS=$exports" `
    "-sALLOW_MEMORY_GROWTH=1" `
    "-sERROR_ON_UNDEFINED_SYMBOLS=0" `
    "-DDOOMGENERIC_RESX=320" `
    "-DDOOMGENERIC_RESY=200" `
    "-DCMAP256=1" `
    "-DAIKERNEL_DOOM_WASM=1" `
    "-DFEATURE_SOUND=1" `
    "-I$include" `
    "-I$DoomGenericDir" `
    @overlay `
    @doomSources `
    "-o" `
    $Output

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& (Join-Path $ProjectDir "verify-wasm.ps1") -Path $Output
