# Issue Draft: Extract Dynamic Control Runtime Into Shared Libraries

## Summary

Move the temporary Doom-scoped dynamic control runtime into shared AIKernel library packages during the next public package update.

## Target Ownership

- `AIKernel.Control`: owns the DynamicPipeline DSL, compiler, deterministic arbitration, objective routing, semantic memory contracts, and unit tests.
- `AIKernel.Wasm`: owns product-neutral WASM/browser runtime boundary adapters for invoking compiled control pipelines from browser-hosted runtimes.
- `AIKernel.Doom`: keeps only scenario-specific state mapping and action mapping adapters.

## Required Library Work

- Add a product-neutral `ControlRuntime` / `DynamicPipeline` package surface.
- Define tensor-like low-layer input contracts with semantic accessor methods.
- Define deterministic arbitration contracts for evidence weights, thresholds, and priority.
- Define browser/WASM invocation contracts that accept a state tensor packet and return an action packet plus decision trace.
- Add unit tests for pipeline compilation, semantic evidence scoring, objective routing, and deterministic tie-breaking.

## Proposed Product-Neutral Contract Names

These names intentionally avoid game, Doom, map, or title terminology:

- `ControlRuntimeAdapter`
- `ControlStateTensorPacket`
- `ControlActionPacket`
- `ControlDecisionTracePacket`
- `ControlSemanticMemoryPacket`
- `ControlArbitrationProfile`
- `DynamicControlPipelineDefinition`
- `CompiledControlPipeline`

The `ControlStateTensorPacket` is the low-layer transport. It should carry a
shape, flat numeric data, channel metadata, and optional semantic accessors. The
`ControlActionPacket` is the runtime-neutral output. Product-specific adapters
map that packet into keyboard, controller, robotics, emulator, or other actuator
surfaces.

## Temporary Doom Boundary

Doom keeps only these adapters until the shared packages are updated:

- Doom observation -> `ControlStateTensorPacket`
- Doom observation -> runtime DSL context values
- Doom profile JSON -> `DynamicControlPipelineDefinition`
- `ControlActionPacket` -> Doom input ABI
- Doom input ABI/key binding
- Doom retry/recovery input dispatch
- Doom sensor toggle/status presentation
- Doom hosted asset download/cache validation
- Doom WASI/import compatibility bridge
- Doom native audio ring-buffer bridge
- Doom auditory runtime snapshot bridge
- Doom WAD metadata and palette extraction
- Doom status/debug fields -> `ControlDecisionTracePacket`

The native `DoomWasm.Native` overlay must not be the production Control runtime.
Any `aik_autoplay_*` native prototype is experimental reference code only and
must stay out of `aik_doom_abi.h`, build scripts, and production exports.

## Doom Temporary Implementation To Extract

- `src/DoomProvider/Autoplay/AutoplayPipelineDsl.cs`
- `src/DoomProvider/Autoplay/ControlRuntimePackets.cs`
- `src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js` stays Doom-owned; extract only generic context adapter interfaces.
- `src/DoomWeb/wwwroot/js/autoplay/doom-action-adapter.js` stays Doom-owned; it maps generic action packets to the Doom input ABI and key state.
- `src/DoomWeb/wwwroot/js/autoplay/doom-retry-dispatch.js` stays Doom-owned; it handles Doom-specific retry key sequences after health/death detection.
- `src/DoomWeb/wwwroot/js/autoplay/doom-sensor-inputs.js` stays Doom-owned; it normalizes demo sensor toggles and presentation metadata for the Doom HUD/debug UI.
- `src/DoomWeb/wwwroot/js/autoplay/doom-binary-assets.js` stays Doom-owned; it handles hosted WAD/model/WASM fetch, Cache API validation, and progress signaling for the Doom deployment.
- `src/DoomWeb/wwwroot/js/doom-wasm-imports.js` stays Doom-owned until `AIKernel.Wasm` exposes a product-neutral WASI/import compatibility adapter for browser-hosted runtimes.
- `src/DoomWeb/wwwroot/js/doom-native-audio.js` stays Doom-owned for now; it adapts the Doom native audio ABI ring buffer into a generic PCM packet and sensor snapshot.
- `src/DoomWeb/wwwroot/js/doom-auditory-runtime.js` stays Doom-owned for now; it merges native/bridge audio snapshots into the Doom sensor runtime shape and can later move behind a generic audio-state adapter.
- `src/DoomWeb/wwwroot/js/doom-wad-metadata.js` stays Doom-owned; it parses WAD lumps, PLAYPAL palettes, and map hints for the Doom observation adapter.
- `src/DoomWeb/wwwroot/js/autoplay/control/objective-routing.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/evidence.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/arbitration.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/decision-trace.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js`
- `src/DoomWeb/wwwroot/js/autoplay/control-runtime.js`
- `src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js`
- `tests/js/control-runtime-vm.test.mjs`

The Doom-local `semantics.js` module now owns the temporary semantic memory
update loop for stable symbols such as door, corridor, enemy, safe-zone,
bridge, and computer-room. Extract the product-neutral parts as
`ControlSemanticMemoryPacket` and semantic accessor/update contracts in
`AIKernel.Control`; keep map-specific observations in Doom adapters only.

The Doom-local `decision-trace.js` module is a temporary browser-side shape for
`ControlDecisionTracePacket`. Extract the category/code mapping, top-N clipping,
and priority/telos/objective/evidence entries to shared Control/Wasm packages so
debug UIs can render deterministic arbitration traces without title-specific
logic.

The Doom-local `runtime-packets.js` module is the temporary browser-side
`ControlActionPacket` and status packet formatter. Move its action/status
packet construction into `AIKernel.Wasm` as product-neutral adapter code; keep
only Doom input binding in the Doom repository.

## Non-Goals

- Do not move game-specific stage names, map names, or Doom action semantics into `AIKernel.Wasm`.
- Do not add dynamic control logic to the external native `doom.wasm` engine assembly.
- Do not couple `AIKernel.Control` to browser APIs, WebGPU, or Doom runtime details.

## Philosophical Layer Mapping

AIKernel.Doom remains the execution lab for a philosophical OS model:

- `Ethos`: fail-closed Control gate and safety policy.
- `Logos`: DSL, deterministic pipeline compilation, and replayable logic.
- `Telos`: objective routing from purpose to means to action.
- `Pathos`: arbitration, priority, and evidence pressure.
- `Aisthesis`: sensor tensor and semantic accessors.
- `Energeia`: WASM, GPU, audio, and actuator execution.

The target architecture is complete when these layers are independently
testable and Doom-specific code only binds them to the DOOM observation/action
surface.

## Acceptance Criteria

- Doom can invoke a product-neutral Control WASM/runtime adapter from JS.
- Doom-specific code only maps Doom observations to generic control state and generic action packets to Doom input ABI.
- Existing Doom `doom.wasm` remains limited to engine/runtime compatibility responsibilities.
