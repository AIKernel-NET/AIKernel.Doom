# AIKernel.Doom Release Notes

[日本語](RELEASE_NOTES-ja.md)

## 0.1.1-dev1

Initial public demo sample for AIKernel.Doom.

Highlights:

- Source-only AIKernel.Doom repository for the DOOM WASM browser demo.
- .NET 10 solution in `.slnx` format.
- `DoomProvider`, `DoomCapabilities`, `DoomWasm`, `DoomWasm.Native`, `DoomWeb`, `DoomOptimizer`, and `DoomDemo` projects.
- AIKernel-style Provider / Observer / Operator separation.
- Consent-gated runtime flow for hosted WAD, model, WASM, manifests, and demo metadata.
- Emscripten-oriented native overlay for doomgeneric.
- Browser WebGPU framebuffer path with Canvas fallback.
- Bonsai supervisor surface and AutoPlay control pipeline.
- Phase-routed vision perception engine with detector overlay, manual move mode, sense-only mode, and one-click telemetry capture.
- English and Japanese documentation pairs for all developer docs.

Notes:

- This repository is a sample/demo program, not a NuGet package.
- `IsPackable=false` is set at the shared project level.
- Third-party runtime artifacts such as `DOOM1.WAD`, Bonsai GGUF model files, and generated `doom.wasm` binaries are intentionally not committed.
- Public deployments must host those runtime assets separately and keep consent text, manifests, checksums, and license notices aligned with the hosted files.
