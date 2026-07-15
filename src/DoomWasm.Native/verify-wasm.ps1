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

$requiredExports = @(
    "doom_audio_event_count",
    "doom_audio_event_capacity",
    "doom_audio_event_oldest_sequence",
    "doom_audio_event_available",
    "doom_audio_event_sfx_id",
    "doom_audio_event_sfx_name",
    "doom_audio_event_sfx_name_length",
    "doom_run_facts_available",
    "doom_run_gametic",
    "doom_run_leveltime",
    "doom_run_levelstarttic",
    "doom_run_gamestate",
    "doom_run_gameepisode",
    "doom_run_gamemap",
    "doom_run_level_load_sequence_available",
    "doom_run_level_load_sequence",
    "doom_player_facts_available",
    "doom_player_x_fixed",
    "doom_player_y_fixed",
    "doom_player_angle_bam",
    "doom_player_momx_fixed",
    "doom_player_momy_fixed",
    "doom_player_sector_index",
    "doom_player_health",
    "doom_player_state",
    "doom_player_kill_count",
    "doom_state_count",
    "doom_player_weapon_facts_available",
    "doom_player_ready_weapon",
    "doom_player_pending_weapon",
    "doom_player_weapon_state",
    "doom_player_weapon_ready_state",
    "doom_player_refire",
    "doom_actor_snapshot_available",
    "doom_actor_snapshot_gametic",
    "doom_actor_snapshot_count",
    "doom_actor_snapshot_capacity",
    "doom_actor_snapshot_truncated",
    "doom_actor_identity",
    "doom_actor_x_fixed",
    "doom_actor_y_fixed",
    "doom_actor_sector_index",
    "doom_actor_type",
    "doom_actor_health",
    "doom_actor_flags",
    "doom_actor_line_of_sight"
)
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    Write-Error "Cannot verify WASM ABI exports because node is not available."
}

$verifyExports = @'
const fs = require("fs");
const path = process.argv[2];
const required = process.argv.slice(3);
const module = new WebAssembly.Module(fs.readFileSync(path));
const actual = new Set(WebAssembly.Module.exports(module).map(entry => entry.name));
const missing = required.filter(name => !actual.has(name));
if (missing.length > 0) {
  console.error(`Missing WASM ABI exports: ${missing.join(", ")}`);
  process.exit(5);
}
'@
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$verifyExports | & $nodeCommand.Source - $resolvedPath @requiredExports
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Verified WASM binary and raw-facts ABI: $Path"
