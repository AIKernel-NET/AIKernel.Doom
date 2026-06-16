#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${1:-"$PROJECT_DIR/../../samples/doom.wasm"}"
DOOMGENERIC_DIR="${DOOMGENERIC_DIR:-"$PROJECT_DIR/third_party/doomgeneric/doomgeneric"}"
EMCC="${EMCC:-emcc}"

if ! command -v "$EMCC" >/dev/null 2>&1; then
  echo "emcc not found. Install and activate Emscripten, or run dotnet build without BuildDoomWasm=true." >&2
  exit 3
fi

if [ ! -d "$DOOMGENERIC_DIR" ]; then
  echo "doomgeneric source missing: $DOOMGENERIC_DIR. Run tools/fetch-doomgeneric.sh with a pinned commit." >&2
  exit 2
fi

mkdir -p "$(dirname "$OUTPUT")"

EXPORTS='["_main","_doom_init","_doom_tick","_doom_render","_doom_input","_doom_input_action","_doom_mount_wad","_doom_wad_status","_doom_audio_status","_doom_audio_sample_rate","_doom_audio_channels","_doom_audio_buffer","_doom_audio_capacity_frames","_doom_audio_read_offset_frames","_doom_audio_available_frames","_doom_audio_consume_frames","_doom_audio_event_count","_malloc","_free"]'

"$EMCC" \
  -O3 \
  -sWASM=1 \
  -sSTANDALONE_WASM=1 \
  -sFILESYSTEM=0 \
  "-sEXPORTED_FUNCTIONS=$EXPORTS" \
  -sALLOW_MEMORY_GROWTH=1 \
  -sERROR_ON_UNDEFINED_SYMBOLS=0 \
  -DDOOMGENERIC_RESX=320 \
  -DDOOMGENERIC_RESY=200 \
  -DCMAP256=1 \
  -DAIKERNEL_DOOM_WASM=1 \
  -DFEATURE_SOUND=1 \
  -I"$PROJECT_DIR/include" \
  -I"$DOOMGENERIC_DIR" \
  "$PROJECT_DIR/src/aik_doom_abi.c" \
  "$PROJECT_DIR/src/aik_doom_wad.c" \
  "$PROJECT_DIR/src/aik_doom_input.c" \
  "$PROJECT_DIR/src/aik_doom_time.c" \
  "$PROJECT_DIR/src/aik_doom_log.c" \
  "$PROJECT_DIR/src/aik_doom_wad_file.c" \
  "$PROJECT_DIR/src/aik_doom_sound.c" \
  "$PROJECT_DIR/src/doomgeneric_aikernel.c" \
  $(find "$DOOMGENERIC_DIR" -maxdepth 1 -name '*.c' \
    ! -name 'doomgeneric_allegro.c' \
    ! -name 'doomgeneric_emscripten.c' \
    ! -name 'doomgeneric_linuxvt.c' \
    ! -name 'doomgeneric_sdl.c' \
    ! -name 'doomgeneric_soso.c' \
    ! -name 'doomgeneric_sosox.c' \
    ! -name 'doomgeneric_win.c' \
    ! -name 'doomgeneric_xlib.c' \
    ! -name 'i_allegromusic.c' \
    ! -name 'i_allegrosound.c' \
    ! -name 'i_cdmus.c' \
    ! -name 'i_sdlmusic.c' \
    ! -name 'i_sdlsound.c' \
    ! -name 'w_file.c' \
    ! -name 'w_file_stdc.c' \
    -print) \
  -o "$OUTPUT"

"$PROJECT_DIR/verify-wasm.sh" "$OUTPUT"
