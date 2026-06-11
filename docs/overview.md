# AIKernel.Doom Overview

AIKernel.Doom is a lightweight official demo repository that models DOOM as a WASM process on the AIKernel Semantic OS.

The demo intentionally separates contracts, adapters, and execution flow:

- `DoomWasm` owns ROM metadata and asset resolution.
- `DoomProvider` owns side-effecting Provider behavior and WASM process lifecycle.
- `DoomCapabilities` exposes `doom.start`, `doom.stop`, and `doom.status`.
- `DoomDemo` is the reference CLI Skeleton.
- `DoomWeb` owns the public browser runtime source assets and prompt bootstrap.

Runtime asset acquisition is gated by explicit user consent. The CLI starts suspended with `hintWord=yes`; standard `aik help`, `aik status`, provider, and capability listing commands remain available before approval.

`DoomWeb` does not include hosted third-party binaries such as `DOOM1.WAD`, Bonsai model weights, or generated `doom.wasm` artifacts. Public deployments must mirror those files outside the source repository and publish the corresponding manifests, checksums, consent text, and license notices.
