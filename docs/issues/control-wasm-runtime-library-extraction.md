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
- `src/DoomProvider/Autoplay/AutoplayPipelineStageDefinition.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineSemanticDefinitions.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineLayerDefinitions.cs`
- `src/DoomProvider/Autoplay/AutoplaySensorFusion.cs`
- `src/DoomProvider/Autoplay/AutoplaySensorTensor.cs`
- `src/DoomProvider/Autoplay/AutoplaySensorTensorIcd.cs`
- `src/DoomProvider/Autoplay/AutoplayActionContracts.cs`
- `src/DoomProvider/Autoplay/PhilosophicalPipelinePackets.cs`
- `src/DoomProvider/Autoplay/PhilosophicalPipelineInterfaces.cs`
- `src/DoomProvider/Autoplay/PhilosophicalAutoplayPipeline.cs`
- `src/DoomProvider/Autoplay/LegacyDetAdapter.cs`
- `src/DoomProvider/Autoplay/AutoplayOptimizationProfile.cs`
- `src/DoomProvider/Autoplay/AutoplayOptimizationProfileJson.cs`
- `src/DoomProvider/Autoplay/AutoplayOptimizationProfileJsonParameters.cs`
- `src/DoomProvider/Autoplay/AutoplayOptimizationProfileJsonReader.cs`
- `src/DoomProvider/Autoplay/AutoplayOptimizationProfileParameters.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineDefaults.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineDefaultStages.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineActionTemplates.cs`
- `src/DoomProvider/Autoplay/AutoplayDslValue.cs`
- `src/DoomProvider/Autoplay/AutoplayDslExpressionSyntax.cs`
- `src/DoomProvider/Autoplay/AutoplayDslValueComparer.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineExpressionCompiler.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineContextValueResolver.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineContextValueResolver.cs`
- `src/DoomProvider/Autoplay/AutoplayProfileParameterResolver.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineContext.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineAutoplayStrategy.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineDecision.cs`
- `src/DoomProvider/Autoplay/AutoplayPipelineRuntime.cs`
- `src/DoomProvider/Autoplay/CompiledAutoplayPipelineStage.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgContracts.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgCouncilEvaluator.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgCouncilEvidence.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgLogosCouncil.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgEthosCouncil.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgPathosCouncil.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgGateOptionsNormalizer.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgGateDecisionResolver.cs`
- `src/DoomProvider/Autoplay/AutoplayCtgGovernance.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineDslParser.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineDslParseState.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineDslStatementParser.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineDefinitionNormalizer.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineDefaults.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineLegacyAdapters.cs`
- `src/DoomProvider/Autoplay/DynamicPipelineGraphValidator.cs`
- `src/DoomProvider/Autoplay/ControlRuntimeAdapter.cs`
- `src/DoomProvider/Autoplay/ControlStateTensorPacket.cs`
- `src/DoomProvider/Autoplay/ControlActionPacket.cs`
- `src/DoomProvider/Autoplay/ControlDecisionTracePacket.cs`
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
- `src/DoomWeb/wwwroot/js/autoplay/control/pipeline-graph.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/zoe-veto.js`
- `src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js`
- `src/DoomWeb/wwwroot/js/autoplay/control-runtime.js`
- `src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js`
- `tests/js/control-runtime-vm.test.mjs`

The Doom-local `semantics.js` module now owns the temporary semantic memory
update loop for stable symbols such as door, corridor, enemy, safe-zone,
bridge, and computer-room. Extract the product-neutral parts as
`ControlSemanticMemoryPacket` and semantic accessor/update contracts in
`AIKernel.Control`; keep map-specific observations in Doom adapters only.

The Doom-local `AutoplaySensorTensor.cs` is a staged low-layer tensor/ICD
surface. Extract the product-neutral tensor shape and semantic accessor pattern
to `AIKernel.Wasm`; keep Doom-specific channel names and map observations in
Doom adapters. `AutoplaySensorFusion.cs` and `AutoplayActionContracts.cs` remain
Doom-owned boundary packets until generic state/action packets replace them.

The Doom-local `PhilosophicalPipelinePackets.cs`,
`PhilosophicalPipelineInterfaces.cs`, and `PhilosophicalAutoplayPipeline.cs` are
temporary canonical 4-layer packet, interface, and orchestration surfaces.
Extract product-neutral equivalents into `AIKernel.Control`; keep
`LegacyDetAdapter.cs` as Doom-local transition glue only.

The Doom-local `decision-trace.js` module is a temporary browser-side shape for
`ControlDecisionTracePacket`. Extract the category/code mapping, top-N clipping,
and priority/telos/objective/evidence entries to shared Control/Wasm packages so
debug UIs can render deterministic arbitration traces without title-specific
logic.

The Doom-local `runtime-packets.js` module is the temporary browser-side
`ControlActionPacket` and status packet formatter. The canonical graph compiler
and Zoe/SVC veto evaluator have been split into `pipeline-graph.js` and
`zoe-veto.js`; extract those as product-neutral DynamicPipeline graph and safety
gate primitives alongside the action/status packet construction in
`AIKernel.Wasm`. Keep only Doom input binding in the Doom repository.

The Doom-local `AutoplayPipelineExpressionCompiler.cs` is the temporary
deterministic expression evaluator for profile predicates, action values, and
health-only Zoe veto rules. Extract it to `AIKernel.Control` with the
DynamicPipeline compiler so the same DSL behavior is unit-testable before the
C# control runtime is published as WASM.

The Doom-local `AutoplayDslExpressionSyntax.cs`, `AutoplayDslValue.cs`, and
`AutoplayDslValueComparer.cs` are product-neutral expression DSL primitives.
Extract them with the compiler/evaluator; keep `AutoplayProfileParameterResolver`
and Doom sensor/context value binding host-owned.

The Doom-local `DynamicPipelineContextValueResolver.cs` is a candidate
product-neutral Zoe/SVC resolver because it only binds health, hp, lethalRisk,
and literals. `AutoplayPipelineContextValueResolver.cs` is Doom-owned because it
binds Doom sensor fusion, yaw hints, context labels, and profile parameters.

The Doom-local `AutoplayProfileParameterResolver.cs` is intentionally
Doom-owned. Its parameter list now comes from
`AutoplayOptimizationProfileParameters.cs` so JSON export and `$parameter`
resolution share one catalog. When extracting the expression compiler, replace
this direct profile catalog with a product-neutral parameter lookup interface
supplied by the host adapter.

The Doom-local `AutoplayOptimizationProfileJson.cs` is deployment/profile I/O
and should stay host-owned. Extract only the product-neutral parameter catalog
shape from `AutoplayOptimizationProfileParameters.cs`; keep Doom-specific tuning
names in Doom until a generic host parameter contract exists.

The Doom-local `AutoplayPipelineDefaults.cs` contains title-specific default
stage names, evidence weights, and action templates. Do not extract those
defaults into `AIKernel.Control` or `AIKernel.Wasm`; extract only the profile
DSL contract and compiler/evaluator surfaces.

The Doom-local `AutoplayPipelineContext.cs` is intentionally Doom-owned. It
adapts `SensorFusion` and Doom profile parameters into the temporary compiled
stage context. When extracting the runtime, replace this direct type with a
product-neutral state tensor/context contract supplied by the host adapter.

The Doom-local `AutoplayPipelineRuntime.cs` is the temporary C# runtime shell
around compiled pipeline stages. Extract only the product-neutral compiled
pipeline, stage evaluation, deterministic arbitration trace, and runtime
contracts; keep Doom observation/action adapters in the Doom repository.

The Doom-local `AutoplayCtgContracts.cs`,
`AutoplayCtgCouncilEvaluator.cs`, and `AutoplayCtgGovernance.cs` are the
temporary CTG proposal, council trace, gate decision, council vote, and gate
aggregation surfaces. Extract them as product-neutral Krisis governance packets
and deterministic gate operators; keep title-specific semantic evidence
production in Doom adapters.

The Doom-local `DynamicPipelineDslParser.cs`,
`DynamicPipelineDslParseState.cs`, and `DynamicPipelineDslStatementParser.cs`
are the temporary text DSL frontend for the canonical 4-layer graph. Extract
them as product-neutral parser components alongside diagnostics; keep
Doom-specific default profiles and context binding in Doom.

The Doom-local `DynamicPipelineDefinitionNormalizer.cs` owns default filling and
legacy detect/hodos/behavior adapters. Extract the product-neutral normalization
contract with explicit deprecation diagnostics; keep title-specific default
profiles in Doom.

The Doom-local `DynamicPipelineGraphValidator.cs` owns canonical graph
diagnostics such as undefined Phainesis/Nous references, Kairos priority axes,
and Zoe health-only input constraints. Extract it with the graph builder so
compiled pipelines fail consistently across JS, C#, and WASM hosts.

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
