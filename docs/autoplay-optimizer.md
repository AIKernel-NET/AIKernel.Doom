# Autoplay Optimizer

[日本語](autoplay-optimizer-ja.md)

`DoomOptimizer` is the source-side profile optimizer for the AIKernel.Doom autoplay demo.

It is the repository's Observer ROM implementation. It preserves telemetry and
candidate profiles so tuning can become repeatable rather than depending on
manual memory of what happened in the browser.

The optimizer keeps the demo responsibilities separated:

- `DoomProvider.Autoplay` owns the `IAutoplayStrategy` implementation and profile contract.
- `DoomOptimizer` acts as an Observer ROM runner that evaluates candidate profiles and records telemetry.
- `DoomWeb` loads the selected `autoplay-profile.json` at runtime.

This follows the AIKernel guideline split:

- strategy contracts remain small and explicit,
- profile parameters are data,
- telemetry is observer output,
- runtime assets stay outside the source repository.

The initial milestone is intentionally small and deterministic: open one door probe and defeat one enemy in the Observer ROM scenario. The generated profile is stored at:

```text
src/DoomWeb/wwwroot/demo/doom/autoplay-profile.json
```

Run the optimizer from the repository root:

```powershell
dotnet run --project src/DoomOptimizer/DoomOptimizer.csproj
```

The latest telemetry is written to `artifacts/autoplay/observer-rom-latest.json`. The `artifacts` directory is ignored because it may contain repeated run data.

The repository does not commit hosted WAD or model runtime artifacts such as `DOOM1.WAD` or Bonsai model weights. The public 0.1.3 Web demo intentionally commits `doom.wasm` with its manifest and GPL corresponding-source materials.
