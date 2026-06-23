# AIKernel.Doom Overview

[日本語](overview-ja.md)

AIKernel.Doom is a lightweight official demo repository that models DOOM as a WASM process on the AIKernel Semantic OS.

It is also a guideline-aligned technical sample. The code and documentation are
organized to show how AIKernel's Interface-Led Architecture,
Provider-Observer-Operator model, DAG-style execution, and fail-closed consent
boundaries can be applied to a real-time browser/WASM workload.

The demo intentionally separates contracts, adapters, and execution flow:

- `DoomWasm` owns ROM metadata and asset resolution.
- `DoomProvider` owns side-effecting Provider behavior and WASM process lifecycle.
- `DoomCapabilities` exposes `doom.start`, `doom.stop`, and `doom.status`.
- `DoomDemo` is the reference CLI Skeleton.
- `DoomWeb` owns the public browser runtime source assets and prompt bootstrap.

Runtime asset acquisition is gated by explicit user consent. The CLI starts suspended with `hintWord=yes`; standard `aik help`, `aik status`, provider, and capability listing commands remain available before approval.

`DoomWeb` does not include hosted WAD or model binaries such as `DOOM1.WAD` or Bonsai model weights. The public 0.1.3 Web demo includes the generated `doom.wasm` artifact in the repository with a deployment manifest, checksum, corresponding source recipe, patches, build scripts, consent text, and license notices.

For a developer-oriented reading path, start with [Documentation](README.md),
then continue through [Architecture](architecture.md), [Web Runtime](web-runtime.md),
[Vision Perception Engine](vision-perception-engine.md), and
[Autoplay Control Pipeline](autoplay-control-pipeline.md).
