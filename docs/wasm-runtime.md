# WASM Runtime

[日本語](wasm-runtime-ja.md)

DOOM is loaded from `samples/doom.rom`, whose entry is `doom.wasm`.

This runtime surface is the AIKernel Operator boundary for the legacy native
engine. It keeps the C engine behind a small ABI, avoids browser file I/O, and
lets Providers mount runtime assets explicitly after consent.

Resolution order:

1. configured `DoomWasmPath`
2. configured `AssetRoot/doom.wasm`
3. ROM directory next to `doom.rom`
4. runtime cache
5. optional simulated module in demo mode

When simulation is disabled, a missing `doom.wasm` returns `DOOM_WASM_NOT_FOUND`. The CLI enables simulation so the official demo boots without committing a large binary.

WebGPU is selected only when requested and `AIKERNEL_DOOM_WEBGPU=1`; otherwise the provider reports CPU fallback.

## Native WASM Project

`src/DoomWasm.Native` is the native/Emscripten overlay. It is an MSBuild utility project and is included in `AIKernel.Doom.slnx`.

Default `dotnet build` skips native compilation. To build `samples/doom.wasm`, provide Emscripten and doomgeneric source, then opt in:

```powershell
dotnet build AIKernel.Doom.slnx -p:BuildDoomWasm=true
```

The native overlay exports:

```c
int main(int argc, char** argv);
int doom_init(void);
int doom_tick(void);
uint8_t* doom_render(void);
void doom_input(int keycode, int pressed);
```

These exports are the stable contract. Higher-level provider and web code must
not depend on doomgeneric internals when the ABI can express the same behavior.

It also exports `doom_mount_wad` and `doom_wad_status` so AIKernel can pass a user-provided or shareware WAD through WASM linear memory. The overlay validates `IWAD`/`PWAD` headers and returns explicit error codes for missing or invalid WAD data.

This memory-backed WAD mount is the key fail-closed design choice: the native
runtime does not reach into host files, does not auto-download data, and does
not invent placeholder WAD content.

`doom_render()` returns an 8-bit paletted framebuffer in WASM memory. The build fixes the resolution at 320x200 with `-DDOOMGENERIC_RESX=320`, `-DDOOMGENERIC_RESY=200`, and `-DCMAP256=1`.

## Source And WAD Policy

The selected DOOM source base is `ozkl/doomgeneric`:

```text
https://github.com/ozkl/doomgeneric
```

Use `src/DoomWasm.Native/tools/fetch-doomgeneric.*` with an explicit pinned commit. The repository does not auto-download source during build.

Commercial WADs are never committed. For shareware `DOOM1.WAD` information, see:

```text
https://doomwiki.org/wiki/DOOM1.WAD
```

## Emscripten Setup

Install Emscripten outside this repository:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```
