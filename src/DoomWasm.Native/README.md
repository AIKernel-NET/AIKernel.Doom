# DoomWasm.Native

`DoomWasm.Native` contains the AIKernel DOOM WASM native overlay for Emscripten.

It does not include DOOM engine source, WAD files, or a generated `doom.wasm`.

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

## WAD Handling

WAD data is not read from a filesystem by this overlay. AIKernel should copy a user-provided/shareware WAD into WASM linear memory, then call `doom_mount_wad(ptr, size)` before `doom_init()`. The native side validates `IWAD`/`PWAD` headers and returns explicit error codes.

The framebuffer returned by `doom_render()` is an 8-bit paletted buffer with width 320 and height 200.

Audio is disabled through the doomgeneric arguments `-nosound`, `-nosfx`, and `-nomusic`; AIKernel.Doom does not expose audio for this demo.

## Fetch doomgeneric

Choose and record a pinned upstream commit:

```powershell
pwsh ./tools/fetch-doomgeneric.ps1 -Commit <pinned-commit-sha>
```

No automatic download is performed by build scripts.

Default upstream is `https://github.com/ozkl/doomgeneric`.

## WAD Source

Commercial WADs must not be committed. For shareware WAD background and acquisition notes, see:

```text
https://doomwiki.org/wiki/DOOM1.WAD
```
