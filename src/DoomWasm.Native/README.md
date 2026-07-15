# DoomWasm.Native

`DoomWasm.Native` contains the AIKernel DOOM WASM native overlay for Emscripten.

It does not include WAD files. The public 0.1.3 Web demo includes the generated
`src/DoomWeb/wwwroot/demo/doom/doom.wasm` artifact; this native project keeps the
source recipe, patches, build scripts, and GPL notice material required to
rebuild and audit that artifact.

## Build Policy

Default `dotnet build` skips native WASM compilation so the .NET solution remains buildable without Emscripten.

The Emscripten build uses `-sFILESYSTEM=0`; WAD access is supplied by the AIKernel memory-backed adapter instead of libc file I/O.

Native build is opt-in:

```powershell
dotnet build ..\..\AIKernel.Doom.slnx -p:BuildDoomWasm=true
```

or:

```powershell
$env:AIKERNEL_BUILD_DOOM_WASM='true'
dotnet build ..\..\AIKernel.Doom.slnx
```

## Requirements

- Emscripten SDK activated so `emcc` is on `PATH`
- doomgeneric source fetched into `third_party/doomgeneric`
- user-provided or shareware WAD supplied at runtime through AIKernel memory-backed ABI

## Install Emscripten

Emscripten is not installed or downloaded by this repository. Install it outside the repo and activate it before native builds:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

On Windows PowerShell, activate with the Emscripten SDK script for your shell, then confirm `emcc --version` works.

## ABI Exports

Required exports:

- `main`
- `doom_init`
- `doom_tick`
- `doom_render`
- `doom_input`

Additional AIKernel WAD exports:

- `doom_mount_wad`
- `doom_wad_status`

Additional AIKernel audio bridge exports:

- `doom_audio_status`
- `doom_audio_sample_rate`
- `doom_audio_channels`
- `doom_audio_buffer`
- `doom_audio_capacity_frames`
- `doom_audio_read_offset_frames`
- `doom_audio_available_frames`
- `doom_audio_consume_frames`
- `doom_audio_event_count`
- `doom_audio_event_capacity`
- `doom_audio_event_oldest_sequence`
- `doom_audio_event_available`
- `doom_audio_event_sfx_id`
- `doom_audio_event_sfx_name`
- `doom_audio_event_sfx_name_length`

Additional raw native run-fact exports:

- `doom_run_facts_available`
- `doom_run_gametic`
- `doom_run_leveltime`
- `doom_run_levelstarttic`
- `doom_run_gamestate`
- `doom_run_gameepisode`
- `doom_run_gamemap`
- `doom_run_level_load_sequence_available`
- `doom_run_level_load_sequence`

Additional raw native player-fact exports:

- `doom_player_facts_available`
- `doom_player_x_fixed`
- `doom_player_y_fixed`
- `doom_player_angle_bam`
- `doom_player_momx_fixed`
- `doom_player_momy_fixed`
- `doom_player_sector_index`
- `doom_player_health`
- `doom_player_state`
- `doom_player_kill_count`
- `doom_state_count`
- `doom_player_weapon_facts_available`
- `doom_player_ready_weapon`
- `doom_player_pending_weapon`
- `doom_player_weapon_state`
- `doom_player_weapon_ready_state`
- `doom_player_refire`

Additional bounded raw native actor-snapshot exports:

- `doom_actor_snapshot_available`
- `doom_actor_snapshot_gametic`
- `doom_actor_snapshot_count`
- `doom_actor_snapshot_capacity`
- `doom_actor_snapshot_truncated`
- `doom_actor_identity`
- `doom_actor_x_fixed`
- `doom_actor_y_fixed`
- `doom_actor_sector_index`
- `doom_actor_type`
- `doom_actor_health`
- `doom_actor_flags`
- `doom_actor_line_of_sight`

`doom_input` returns an AIKernel result code. `AIK_DOOM_OK` means that the
native input queue accepted the event; a caller must not acknowledge or drop a
queued event when another result is returned.

## WAD Handling

WAD data is not read from a filesystem by this overlay. AIKernel should copy a user-provided/shareware WAD into WASM linear memory, then call `doom_mount_wad(ptr, size)` before `doom_init()`. The native side validates `IWAD`/`PWAD` headers and returns explicit error codes.

The framebuffer returned by `doom_render()` is an 8-bit paletted buffer with width 320 and height 200.

## Audio Bridge

Sound effects are exposed through the AIKernel native audio bridge in
`src/aik_doom_sound.c`. The bridge implements doomgeneric's `DG_sound_module`
without SDL, Allegro, WebAudio, or OS audio dependencies. It converts DOOM SFX
lumps into a stereo 44.1kHz PCM ring buffer in WASM linear memory. Browser-side
code may opt in to playback by pulling frames through the `doom_audio_*` ABI.

The overlay also retains the latest 32 native SFX requests in a fixed ring.
Callers use `doom_audio_event_count` as the latest sequence and enumerate from
`doom_audio_event_oldest_sequence` through that value. The ABI returns the raw
DOOM SFX numeric identity and symbolic name; it deliberately does not classify
the event as a door, pickup, failure, or other gameplay meaning.

The `doom_run_*` ABI returns raw engine counters and enum values. Availability
is explicit so an unavailable counter is not confused with an observed zero.
Scenario meaning and run/reset policy remain outside the native Provider.

The `doom_player_*` ABI exposes only the current engine-owned player pose,
map-local sector ordinal, health, raw `playerstate_t` value, kill count, and
weapon-cycle facts. Weapon facts contain the raw ready/pending weapon enums,
the current weapon psprite state index, that weapon's engine readystate index,
and raw refire count. `doom_state_count` exposes the same compiled `NUMSTATES`
bound used to validate those state indices; none of these facts decides whether
or when to attack.
Position and momentum use DOOM signed 16.16 fixed point values; angle uses the
unsigned 32-bit binary-angle representation (BAM). Availability requires an
initialized `GS_LEVEL` with an active console-player object. A missing or
invalid sector pointer is reported as `-1` independently of pose availability.
Weapon availability additionally requires a valid ready weapon and weapon
psprite state. The native overlay does not classify a pose, health, state, or
weapon cycle as a door, contact, route, death, attack opportunity, or scenario
milestone; those decisions remain in the Control layer.

The `doom_actor_*` ABI is a fixed-capacity snapshot captured after native
initialization and every native tick. It retains at most 64 engine mobjs whose
raw flags contain `MF_COUNTKILL`. The snapshot is stamped with the raw engine
`gametic`; `count`, `capacity`, and `truncated` make bounds explicit. Each entry
contains the actor's WASM address as its lifetime-stable identity, signed 16.16
position, map-local sector ordinal, raw type, health, flags, and the boolean result of the engine's
`P_CheckSight` from the current player. It does not classify shootability,
liveness, hostility, targeting priority, or combat outcome. Indexed getters
return zero outside the captured count except `doom_actor_sector_index`, which
returns the same invalid-sector sentinel `-1` both for an invalid actor sector
pointer and an out-of-range row. Callers must first validate the snapshot
availability, bounds, and truncation facts.

`doom_run_level_load_sequence` is an engine-owned process-lifetime sequence.
It starts at 1 when `GS_LEVEL` is first observed after `doomgeneric_Create` or a
tick, then increments after a tick whenever `levelstarttic`, `gameepisode`, or
`gamemap` changes. A same-map death/reborn load is therefore a new sequence when
the engine updates `levelstarttic`. The sequence saturates at `UINT32_MAX`
rather than wrapping. Its availability remains false before the first observed
`GS_LEVEL`, and is always false in the no-doomgeneric fallback build.

Music remains disabled through the `-nomusic` doomgeneric argument. The bridge
does not implement MUS/MIDI playback.

## Docker Build

The repository can build the native artifact with the Emscripten Docker image:

```bash
docker run --rm \
  -v /mnt/c/Users/HP/source/repos/AIKernel-NET:/workspace \
  -w /workspace/AIKernel.Doom/src/DoomWasm.Native \
  emscripten/emsdk:latest \
  bash ./build.sh /workspace/AIKernel.Doom/samples/doom.wasm
```

## Fetch doomgeneric

Choose and record a pinned upstream commit:

```powershell
pwsh ./tools/fetch-doomgeneric.ps1 -Commit <pinned-commit-sha>
```

No automatic download is performed by build scripts.

Default upstream is `https://github.com/ozkl/doomgeneric`.

`tools/fetch-doomgeneric.ps1` and `tools/fetch-doomgeneric.sh` apply
`patches/doomgeneric-upstream.patch` when it is applicable. The patch records the
minimal upstream edits required by the AIKernel memory-backed WAD adapter,
cooperative browser tick loop, and SDL-free WASM sound bridge.

The current local checkout used for the public demo artifact is:

```text
dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284
```

## GPL Corresponding Source

`doom.wasm` is derived from GPL-covered doomgeneric source. Any distribution of
the compiled artifact must provide the corresponding source required by the
applicable GPL terms. At minimum, keep the following available:

- the pinned doomgeneric source checkout under `third_party/doomgeneric`;
- AIKernel overlay files under `src/`, including `aik_doom_sound.c`;
- build scripts `build.ps1`, `build.sh`, and `Makefile`;
- `patches/doomgeneric-aikernel.patch`;
- `patches/doomgeneric-upstream.patch`;
- upstream copyright notices and GPL license text.

## WAD Source

Commercial WADs must not be committed. For shareware WAD background and acquisition notes, see:

```text
https://doomwiki.org/wiki/DOOM1.WAD
```
