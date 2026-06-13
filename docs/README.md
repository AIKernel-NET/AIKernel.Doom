# AIKernel.Doom Documentation

[日本語](README-ja.md)

AIKernel.Doom is a source-only demonstration repository for running a DOOM
WASM process under an AIKernel-style runtime, then supervising it with a
browser-side perception and autoplay control loop.

The implementation is intentionally documented as an **AIKernel Development
Guidelines compliant sample**. It is not just a game demo; it is a compact
reference for applying Interface-Led Architecture, Provider-Observer-Operator
responsibility separation, DAG-style control flow, fail-closed runtime gates,
and evidence-driven Observer ROM development to a real interactive workload.

This documentation is written for developers who want to understand or reuse
the implementation techniques. The repository is a demo sample, not a packaged
DOOM distribution. It does not commit third-party runtime artifacts such as
`DOOM1.WAD`, Bonsai GGUF model files, or generated `doom.wasm` binaries.

## Reading Path

Start here:

1. [Overview](overview.md)
2. [Architecture](architecture.md)
3. [WASM Runtime and ABI](wasm-runtime.md)
4. [Web Runtime](web-runtime.md)
5. [Vision Perception Engine](vision-perception-engine.md)
6. [Autoplay Control Pipeline](autoplay-control-pipeline.md)
7. [Debugging and Telemetry](debugging-and-telemetry.md)
8. [Autoplay Optimizer](autoplay-optimizer.md)
9. [Development Methodology](development-methodology.md)
10. [Asset and Release Operations](asset-and-release-operations.md)

Reference surfaces:

- [Provider](provider.md)
- [CLI](cli.md)

## Developer Mental Model

The demo separates responsibilities using the AIKernel Provider-Observer-
Operator model described in the AIKernel development guidelines:

- **Provider**: `DoomProvider`, `DoomWasm`, `DoomWeb`, and browser runtime
  bridges own side-effecting boundaries such as WASM module load, WAD mount,
  WebGPU texture ownership, user consent, and hosted asset manifests.
- **Observer**: telemetry, debug overlay, phase checks, optimizer ROM runs, and
  copied logs record what happened without changing the gameplay state.
- **Operator**: the autoplay strategy, browser cooperative scheduler, and
  phase router convert observed state into bounded input actions.

Guideline alignment:

- contracts are explicit (`IAutoplayStrategy`, `SensorFusion`,
  `ActionCommand`, capability names, WASM ABI exports),
- side effects are isolated behind Provider boundaries,
- phase routing behaves as a deterministic control DAG,
- large asset downloads are fail-closed behind consent,
- telemetry and screenshots act as Observer evidence,
- optimization profiles preserve learned parameters outside hard-coded logic.

The main reusable techniques are:

- a standalone WASM ABI for a legacy C game loop,
- memory-backed asset mounting instead of file I/O,
- zero-copy WebGPU framebuffer binding where available,
- paletted 8-bit framebuffer sampling,
- 3x3 spatial perception and multi-frame motion signatures,
- HUD-derived state decoding,
- phase-routed control pipelines,
- one-click telemetry capture for human-in-the-loop tuning,
- persisted optimization profiles.

## Repository Map

```text
src/DoomWasm.Native/   Emscripten overlay and ABI-facing C code
src/DoomWasm/          ROM metadata and asset resolution
src/DoomProvider/      AIKernel provider and autoplay contracts
src/DoomCapabilities/  doom.start / doom.stop / doom.status capability layer
src/DoomDemo/          CLI skeleton
src/DoomWeb/           Browser runtime source assets
src/DoomOptimizer/     Profile optimizer and web-runner harness
docs/                  Developer documentation
samples/               Source metadata only
```

## What Is Intentionally Not Here

The repository does not include:

- commercial DOOM WADs,
- shareware `DOOM1.WAD` binaries,
- Bonsai model weights,
- generated `doom.wasm` artifacts,
- browser cache contents,
- optimizer telemetry artifacts.

Deployment operators must host runtime artifacts separately, publish manifests
and license notices, and keep runtime consent text aligned with the hosted
files.
