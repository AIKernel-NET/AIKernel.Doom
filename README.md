# AIKernel.Doom

[日本語 README](README-ja.md)

AIKernel.Doom is a .NET 10 WASM demo for AIKernel Semantic OS. It displays an AIKernel-style boot prompt, suspends on explicit consent, prepares a Bonsai-1.7B supervisor, and exposes DOOM as a WASM process through `doom.start`, `doom.stop`, and `doom.status`.

This repository is a demo/sample program, not a DOOM package. The implementation is maintained as an AIKernel Development Guidelines aligned example of Interface-Led Architecture, Provider-Observer-Operator separation, fail-closed runtime consent, WASM process isolation, WebGPU framebuffer handling, and Observer-driven AutoPlay optimization.

## Documentation

Developer documentation starts at:

```text
docs/README.md
```

Japanese developer documentation starts at:

```text
docs/README-ja.md
```

Release notes:

```text
RELEASE_NOTES.md
RELEASE_NOTES-ja.md
```

Recommended path:

- `docs/architecture.md` - guideline-aligned Provider/Observer/Operator mapping.
- `docs/concept-elevation.md` - concept vocabulary placement and naming guardrails.
- `docs/wasm-runtime.md` - Emscripten/WASI ABI and memory-backed WAD mount.
- `docs/web-runtime.md` - browser worker, WebGPU, prompt, and consent runtime.
- `docs/vision-perception-engine.md` - JavaScript 3x3 vision, HUD, motion, and overlay engine.
- `docs/autoplay-control-pipeline.md` - phase-routed AutoPlay Operator design.
- `docs/debugging-and-telemetry.md` - Sense Only, Phase + Logs, overlay, and copied evidence.
- `docs/development-methodology.md` - human-in-the-loop AI development workflow.
- `docs/autoplay-optimizer.md` - profile optimization and Observer ROM runner.
- `docs/asset-and-release-operations.md` - source-only release and asset boundaries.

## Run

```powershell
dotnet restore AIKernel.Doom.slnx
dotnet build AIKernel.Doom.slnx
dotnet run --project src/DoomDemo/DoomDemo.csproj
```

## CLI

```text
yes
aik help
aik help commands
aik help approval
aik status
aik providers list
aik capabilities list
aik exec run doom
aik capabilities invoke doom.start
aik capabilities invoke doom.stop
aik capabilities invoke doom.status
help
exit
quit
```

## First Launch Consent

Startup is suspended until the user explicitly accepts:

- terms of use
- approximately 300MB runtime data download/cache
- Bonsai-1.7B model acquisition
- DOOM WASM load

The CLI prints `hintWord> yes`. Typing `yes`, `y`, `approve`, or `aik approve doom.runtime-download` records approval and resumes preparation. Rejection keeps the runtime suspended before any model or WASM load begins.

## Assets

`samples/doom.rom` points to `doom.wasm`. The public 0.1.2 Web demo includes the generated `src/DoomWeb/wwwroot/demo/doom/doom.wasm` artifact so the hosted demo can boot consistently. Other runtime deployments can still configure an asset path with `DoomWasmOptions.DoomWasmPath` or place `doom.wasm` beside the ROM. Runtime cache defaults to the user local application data directory.

The demo CLI enables a tiny simulated WASM module so the boot flow can be tested without a large binary. Provider/library usage can disable simulation to receive `DOOM_WASM_NOT_FOUND`.

## Web Runtime Assets

`src/DoomWeb` contains the browser prompt/runtime source assets used by public Web deployments:

- browser `WebGpuComputeProvider` bridge
- `doom.wasm` loader and framebuffer loop
- Bonsai AutoPlay supervisor logic
- public prompt bootstrap script
- terms and license notice page

This project does not include `DOOM1.WAD` or Bonsai GGUF model files. The public 0.1.2 Web demo includes the generated `doom.wasm` runtime artifact together with the corresponding source recipe, patches, build scripts, manifest, and license notices. Deployment operators must keep WAD/model hosting, consent text, manifests, checksums, and license notices aligned with the hosted files.

## Native DOOM WASM Build

`src/DoomWasm.Native` contains the Emscripten/WASI-facing DOOM port overlay. It uses `ozkl/doomgeneric` as the selected source base:

```text
https://github.com/ozkl/doomgeneric
```

Fetch doomgeneric with a pinned commit before native builds:

```powershell
pwsh src/DoomWasm.Native/tools/fetch-doomgeneric.ps1 -Commit <pinned-commit-sha>
```

Install and activate Emscripten outside this repository:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

Then opt in to native WASM compilation:

```powershell
dotnet build AIKernel.Doom.slnx -p:BuildDoomWasm=true
```

Default `dotnet build` skips native compilation so the solution builds without `emcc`.

The native build exports `main`, `doom_init`, `doom_tick`, `doom_render`, and `doom_input`. `doom_render` returns an 8-bit paletted 320x200 framebuffer. File I/O is disabled with `-sFILESYSTEM=0`; WAD bytes are mounted through the AIKernel memory-backed ABI.

Commercial WADs are not included. For shareware `DOOM1.WAD` information, see:

```text
https://doomwiki.org/wiki/DOOM1.WAD
```

## Bonsai-1.7B Supervisor

The Bonsai-1.7B integration is isolated to an internal supervisor interface. The supervisor prepares a Bonsai execution surface through `WebGpuComputeProvider` and records its state vector through that compute provider. If a browser/native WebGPU backend is unavailable, `WebGpuComputeProvider` uses its deterministic CPU fallback and reports that in status output.

Because `ref/env.txt` does not define a Bonsai transformer inference API, tokenizer runtime, or sampling contract, this repository does not fake full Bonsai text inference. The current policy remains deterministic and reads only DOOM game state before issuing game-internal cheat commands such as health or ammo recovery. It never executes OS commands or touches user data.

## Environment

`ref/env.txt` was used as the canonical environment reference. It provides local model/tool paths, but no TargetFramework, SDK pin, package feed, download URL, checksum, or DOOM asset path. TargetFramework is therefore `net10.0`, following the user correction and existing AIKernel workspace settings.

NuGet references use exact ranges:

- `AIKernel.Core` `[0.1.1]`
- `AIKernel.Providers.Standard` `[0.1.1]`
- `AIKernel.Wasm.Runtime` `[0.1.1]`
- `AIKernel.Wasm.WebGpuComputeProvider` `[0.1.1]`

The prompt named `AIKernel.Providers` and `AIKernel.Tools` as package IDs, but those meta package IDs are not published on nuget.org. `AIKernel.Tools` `[0.1.0-dev9]` is therefore not referenced; the CLI surface is implemented locally against the public capability contracts.

## Known Constraints

- The CLI uses a simulated WASM module unless a real `doom.wasm` is configured.
- Runtime download is represented as an adapter boundary; no build-time download occurs.
- WebGPU reports CPU fallback unless a concrete WebGPU backend is registered.
- The Bonsai-1.7B supervisor uses `WebGpuComputeProvider` for its execution surface, but full transformer inference is intentionally deferred until a real Bonsai runtime API is defined in `ref/env.txt`.
