# DoomWasm.Native

`DoomWasm.Native` contains the AIKernel DOOM WASM native overlay for Emscripten.

It does not include WAD files. The public 0.1.2 Web demo includes the generated
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

## WAD Handling

WAD data is not read from a filesystem by this overlay. AIKernel should copy a user-provided/shareware WAD into WASM linear memory, then call `doom_mount_wad(ptr, size)` before `doom_init()`. The native side validates `IWAD`/`PWAD` headers and returns explicit error codes.

The framebuffer returned by `doom_render()` is an 8-bit paletted buffer with width 320 and height 200.

## Audio Bridge

Sound effects are exposed through the AIKernel native audio bridge in
`src/aik_doom_sound.c`. The bridge implements doomgeneric's `DG_sound_module`
without SDL, Allegro, WebAudio, or OS audio dependencies. It converts DOOM SFX
lumps into a stereo 44.1kHz PCM ring buffer in WASM linear memory. Browser-side
code may opt in to playback by pulling frames through the `doom_audio_*` ABI.

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
