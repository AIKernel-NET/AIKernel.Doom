# Dynamic Pipeline 4-layer migration notes

AIKernel.Doom stages the AIKernel.DynamicPipeline 4-layer architecture before the next
AIKernel.Control / AIKernel.Wasm package update.

Canonical execution order:

```text
Aisthesis -> Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe
```

DSL block shape:

```text
aisthesis {
  sensor visual
  sensor movement
  sensor health
}
noesis {
  phainesis {
    event looming from visual
    event stuck from movement
    event damage from health
  }
  nous {
    vector loomingVector from looming
    vector enemyVector from enemySeen
  }
}
krisis {
  topos {
  }
  kairos {
    priority pathos
    priority ethos
    priority logos
  }
}
kinesis {
  kinesis {
  }
  zoe {
    veto when hp < 10
    veto when lethalRisk > 0.7
  }
}
```

Deprecated adapters:

- `detect { ... }` maps to `noesis.phainesis`.
- `hodos { ... }` maps to `noesis.nous` / `krisis.topos`.
- `behavior avoid` and `behavior combat` map to Kairos `priority pathos`.
- `behavior explore` and `behavior structure` map to Kairos `priority logos`.

Runtime constraints:

- Zoe receives only health-derived inputs: `health`, `hp`, and `lethalRisk`.
- Kairos emits priority-axis decisions, not action categories.
- Kinesis consumes Kairos output and emits motion/action only.
- The compiler emits diagnostics for undefined events, undefined vectors, invalid
  Kairos axes, and non-health Zoe veto inputs.

Current Doom-side staging split:

- `AutoplaySensorFusion.cs` contains the Doom sensor fusion packet.
- `AutoplaySensorTensor.cs` contains the low-layer tensor matrix.
- `AutoplaySensorTensorIcd.cs` contains the semantic ICD channel map and
  semantic accessors.
- `AutoplayActionContracts.cs` contains `ActionCommand` and `IAutoplayStrategy`.
- `PhilosophicalPipelinePackets.cs` contains the 4-layer packet shapes.
- `PhilosophicalPipelineInterfaces.cs` contains the stage interfaces.
- `PhilosophicalAutoplayPipeline.cs` contains only the canonical orchestrator.
- `LegacyDetAdapter.cs` contains the deprecated DET compatibility adapter.
- `AutoplayOptimizationProfile.cs` contains the profile tuning values only.
- `AutoplayOptimizationProfileJson.cs` contains profile JSON loading and
  compatibility parsing for the `parameters` envelope.
- `AutoplayOptimizationProfileJsonParameters.cs` contains scalar tuning
  parameter application from profile JSON.
- `AutoplayOptimizationProfileJsonReader.cs` contains typed `JsonElement`
  fallback reads used by profile JSON compatibility parsing.
- `AutoplayOptimizationProfileParameters.cs` contains the single parameter
  catalog used by JSON export and `$parameter` DSL resolution.
- `AutoplayPipelineDsl.cs` contains the root profile/DSL definition only.
- `AutoplayPipelineStageDefinition.cs` contains deterministic stage
  declaration records.
- `AutoplayPipelineSemanticDefinitions.cs` contains semantic memory,
  objective, and arbitration declaration records.
- `AutoplayPipelineLayerDefinitions.cs` contains Aisthesis / Noesis /
  Krisis / Kinesis layer declaration records.
- `AutoplayPipelineDefaults.cs` contains only the public default pipeline
  instance.
- `AutoplayPipelineDefaultStages.cs` contains the Doom-local default stage
  catalog.
- `AutoplayPipelineActionTemplates.cs` contains Doom-local action dictionary
  templates used by the default pipeline.
- `AutoplayPipelineDslCompiler.cs` contains profile-to-runtime compilation only.
- `DynamicPipelineAutoplayStrategy.cs` contains the Doom compatibility strategy
  wrapper.
- `AutoplayPipelineDecision.cs` contains deterministic decision trace records.
- `AutoplayPipelineRuntime.cs` contains the compiled pipeline runtime.
- `CompiledAutoplayPipelineStage.cs` contains deterministic stage evaluation.
- `AutoplayPipelineContext.cs` contains the Doom observation context adapter
  used by compiled stages.
- `AutoplayPipelineExpressionCompiler.cs` contains the temporary deterministic
  expression DSL evaluator for profile predicates, actions, and Zoe veto rules.
- `AutoplayPipelineContextValueResolver.cs` contains Doom observation/profile
  value binding for the expression DSL.
- `DynamicPipelineContextValueResolver.cs` contains health-only DynamicPipeline
  value binding for Zoe/SVC predicates.
- `AutoplayDslValue.cs` contains the expression evaluator's small typed value
  carrier.
- `AutoplayDslExpressionSyntax.cs` contains expression normalization, boolean
  term splitting, comparison token detection, and unquoting.
- `AutoplayDslValueComparer.cs` contains deterministic typed value comparison.
- `AutoplayProfileParameterResolver.cs` contains Doom profile parameter
  value conversion used by `$parameter` expressions.
- `AutoplayCtgContracts.cs` contains the temporary CTG packet and trace
  contracts; `AutoplayCtgCouncilEvaluator.cs` contains the ordered Topos
  council orchestration; `AutoplayCtgLogosCouncil.cs`,
  `AutoplayCtgEthosCouncil.cs`, and `AutoplayCtgPathosCouncil.cs` contain
  individual council voting rules; `AutoplayCtgCouncilEvidence.cs` contains
  shared semantic scoring helpers; `AutoplayCtgGateOptionsNormalizer.cs`
  contains option clamping; `AutoplayCtgGateDecisionResolver.cs` contains
  quorum decision and action application; `AutoplayCtgGovernance.cs` contains
  only the public gate orchestration.
- `DynamicPipelineDslParser.cs` contains the top-level text scan and required
  block validation; `DynamicPipelineDslParseState.cs` owns parse state and AST
  construction; `DynamicPipelineDslStatementParser.cs` owns statement decoding.
- `DynamicPipelineDefinitionNormalizer.cs` contains profile normalization before
  AST construction.
- `DynamicPipelineDefaults.cs` contains canonical fallback sensors, events,
  priority axes, actions, and Zoe veto rules.
- `DynamicPipelineLegacyAdapters.cs` contains deprecated
  detect/hodos/behavior adapters.
- `DynamicPipelineGraphValidator.cs` contains canonical graph diagnostics,
  including Kairos priority-axis and Zoe health-only validation.
- `ControlRuntimeAdapter.cs` contains the temporary runtime-neutral adapter
  interface.
- `ControlStateTensorPacket.cs` contains flat state tensor transport and
  semantic-memory accessors.
- `ControlActionPacket.cs` contains runtime-neutral action output.
- `ControlDecisionTracePacket.cs` contains replayable decision trace packets.
- Other `DynamicPipeline*.cs` files contain the 4-layer AST, graph, builder,
  compiler, and canonical evaluator that should move to AIKernel.Control /
  AIKernel.Wasm once the public packages can be updated.
- `control/pipeline-graph.js` contains the browser-side canonical DAG compiler.
- `control/zoe-veto.js` contains the browser-side Zoe/SVC veto evaluator.
- `control/runtime-packets.js` keeps only packet/status construction plus
  compatibility delegates for the staged graph and veto modules.
