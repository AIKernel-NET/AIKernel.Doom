#!/usr/bin/env bash
set -euo pipefail

WASM_PATH="${1:-}"
if [ -z "$WASM_PATH" ] || [ ! -f "$WASM_PATH" ]; then
  echo "WASM file not found: $WASM_PATH" >&2
  exit 2
fi

if command -v xxd >/dev/null 2>&1; then
  MAGIC="$(xxd -p -l 8 "$WASM_PATH")"
elif command -v od >/dev/null 2>&1; then
  MAGIC="$(od -An -N8 -tx1 -v "$WASM_PATH" | tr -d ' \n')"
elif command -v python3 >/dev/null 2>&1; then
  MAGIC="$(python3 -c 'import sys; print(open(sys.argv[1], "rb").read(8).hex())' "$WASM_PATH")"
else
  echo "Cannot verify WASM magic: xxd, od, and python3 are unavailable." >&2
  exit 4
fi

if [ "$MAGIC" != "0061736d01000000" ]; then
  echo "Invalid WASM magic/version: $WASM_PATH" >&2
  exit 3
fi

REQUIRED_EXPORTS=(
  doom_audio_event_count
  doom_audio_event_capacity
  doom_audio_event_oldest_sequence
  doom_audio_event_available
  doom_audio_event_sfx_id
  doom_audio_event_sfx_name
  doom_audio_event_sfx_name_length
  doom_run_facts_available
  doom_run_gametic
  doom_run_leveltime
  doom_run_levelstarttic
  doom_run_gamestate
  doom_run_gameepisode
  doom_run_gamemap
  doom_run_level_load_sequence_available
  doom_run_level_load_sequence
  doom_player_facts_available
  doom_player_x_fixed
  doom_player_y_fixed
  doom_player_angle_bam
  doom_player_momx_fixed
  doom_player_momy_fixed
  doom_player_sector_index
  doom_player_health
  doom_player_state
  doom_player_kill_count
  doom_state_count
  doom_player_weapon_facts_available
  doom_player_ready_weapon
  doom_player_pending_weapon
  doom_player_weapon_state
  doom_player_weapon_ready_state
  doom_player_refire
  doom_actor_snapshot_available
  doom_actor_snapshot_gametic
  doom_actor_snapshot_count
  doom_actor_snapshot_capacity
  doom_actor_snapshot_truncated
  doom_actor_identity
  doom_actor_x_fixed
  doom_actor_y_fixed
  doom_actor_sector_index
  doom_actor_type
  doom_actor_health
  doom_actor_flags
  doom_actor_line_of_sight
)

if ! command -v node >/dev/null 2>&1; then
  echo "Cannot verify WASM ABI exports because node is not available." >&2
  exit 4
fi

node -e '
const fs = require("fs");
const path = process.argv[1];
const required = process.argv.slice(2);
const module = new WebAssembly.Module(fs.readFileSync(path));
const actual = new Set(WebAssembly.Module.exports(module).map(entry => entry.name));
const missing = required.filter(name => !actual.has(name));
if (missing.length > 0) {
  console.error(`Missing WASM ABI exports: ${missing.join(", ")}`);
  process.exit(5);
}
' "$WASM_PATH" "${REQUIRED_EXPORTS[@]}"

echo "Verified WASM binary and raw-facts ABI: $WASM_PATH"
