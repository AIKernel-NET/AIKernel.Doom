# Dynamic Pipeline 4-layer 移行メモ

AIKernel.Doom では、次回の AIKernel.Control / AIKernel.Wasm 更新に先行して
AIKernel.DynamicPipeline の 4-layer architecture を staging します。

正規の実行順:

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

Deprecated adapter:

- `detect { ... }` は `noesis.phainesis` に読み替えます。
- `hodos { ... }` は `noesis.nous` / `krisis.topos` に読み替えます。
- `behavior avoid` / `behavior combat` は Kairos `priority pathos` に読み替えます。
- `behavior explore` / `behavior structure` は Kairos `priority logos` に読み替えます。

Runtime constraints:

- Zoe は health 由来の `health`, `hp`, `lethalRisk` だけを受け取ります。
- Kairos は action category ではなく priority-axis decision を出力します。
- Kinesis は Kairos の出力を消費し、motion/action のみを生成します。
- compiler は undefined event/vector、不正な Kairos axis、Zoe veto の
  health-only 違反を診断します。

現在の Doom 側 staging split:

- `AutoplaySensorFusion.cs` は Doom sensor fusion packet を持ちます。
- `AutoplaySensorTensor.cs` は low-layer tensor matrix を持ちます。
- `AutoplaySensorTensorIcd.cs` は semantic ICD channel map と semantic
  accessor を持ちます。
- `AutoplayActionContracts.cs` は `ActionCommand` と `IAutoplayStrategy` を
  持ちます。
- `PhilosophicalPipelinePackets.cs` は 4-layer packet shape を持ちます。
- `PhilosophicalPipelineInterfaces.cs` は stage interface を持ちます。
- `PhilosophicalAutoplayPipeline.cs` は canonical orchestrator のみを
  持ちます。
- `LegacyDetAdapter.cs` は deprecated DET compatibility adapter を持ちます。
- `AutoplayOptimizationProfile.cs` は profile tuning value のみを持ちます。
- `AutoplayOptimizationProfileJson.cs` は profile JSON load と
  `parameters` envelope 互換解析を持ちます。
- `AutoplayOptimizationProfileJsonParameters.cs` は profile JSON から scalar
  tuning parameter を適用する処理を持ちます。
- `AutoplayOptimizationProfileJsonReader.cs` は profile JSON 互換解析が使う
  typed `JsonElement` fallback read を持ちます。
- `AutoplayOptimizationProfileParameters.cs` は JSON export と
  `$parameter` DSL resolution が共有する単一の parameter catalog を持ちます。
- `AutoplayPipelineDsl.cs` は root profile/DSL definition のみを持ちます。
- `AutoplayPipelineStageDefinition.cs` は deterministic stage declaration
  record を持ちます。
- `AutoplayPipelineSemanticDefinitions.cs` は semantic memory、objective、
  arbitration declaration record を持ちます。
- `AutoplayPipelineLayerDefinitions.cs` は Aisthesis / Noesis / Krisis /
  Kinesis layer declaration record を持ちます。
- `AutoplayPipelineDefaults.cs` は public default pipeline instance のみを
  持ちます。
- `AutoplayPipelineDefaultStages.cs` は Doom-local default stage catalog を
  持ちます。
- `AutoplayPipelineActionTemplates.cs` は default pipeline が使う Doom-local
  action dictionary template を持ちます。
- `AutoplayPipelineDslCompiler.cs` は profile から runtime への compile のみを
  持ちます。
- `DynamicPipelineAutoplayStrategy.cs` は Doom compatibility strategy wrapper
  を持ちます。
- `AutoplayPipelineDecision.cs` は deterministic decision trace record を
  持ちます。
- `AutoplayPipelineRuntime.cs` は compiled pipeline runtime を持ちます。
- `CompiledAutoplayPipelineStage.cs` は deterministic stage evaluation を
  持ちます。
- `AutoplayPipelineContext.cs` は compiled stage が使う Doom observation
  context adapter を持ちます。
- `AutoplayPipelineExpressionCompiler.cs` は profile predicate、action、
  Zoe veto rule のための一時的な deterministic expression DSL evaluator を
  持ちます。
- `AutoplayPipelineContextValueResolver.cs` は expression DSL 用の Doom
  observation / profile value binding を持ちます。
- `DynamicPipelineContextValueResolver.cs` は Zoe / SVC predicate 用の
  health-only DynamicPipeline value binding を持ちます。
- `AutoplayDslValue.cs` は expression evaluator の小さな typed value carrier
  を持ちます。
- `AutoplayDslExpressionSyntax.cs` は expression normalize、boolean term
  split、comparison token detection、unquote を持ちます。
- `AutoplayDslValueComparer.cs` は deterministic typed value comparison を
  持ちます。
- `AutoplayProfileParameterResolver.cs` は `$parameter` 式で使う Doom profile
  parameter value conversion を持ちます。
- `AutoplayCtgContracts.cs` は一時的な CTG packet / trace contract を
  持ちます。`AutoplayCtgCouncilEvaluator.cs` は順序付き Topos council
  orchestration、`AutoplayCtgLogosCouncil.cs` / `AutoplayCtgEthosCouncil.cs`
  / `AutoplayCtgPathosCouncil.cs` は個別 council voting rule、
  `AutoplayCtgCouncilEvidence.cs` は shared semantic scoring helper、
  `AutoplayCtgGateOptionsNormalizer.cs` は option clamping、
  `AutoplayCtgGateDecisionResolver.cs` は quorum decision と action
  application、`AutoplayCtgGovernance.cs` は public gate orchestration のみを
  持ちます。
- `DynamicPipelineDslParser.cs` は top-level text scan と required block
  validation、`DynamicPipelineDslParseState.cs` は parse state と AST
  construction、`DynamicPipelineDslStatementParser.cs` は statement decoding
  を持ちます。
- `DynamicPipelineDefinitionNormalizer.cs` は AST construction 前の profile
  normalization を持ちます。
- `DynamicPipelineDefaults.cs` は canonical fallback sensor、event、
  priority axis、action、Zoe veto rule を持ちます。
- `DynamicPipelineLegacyAdapters.cs` は deprecated detect / hodos /
  behavior adapter を持ちます。
- `DynamicPipelineGraphValidator.cs` は Kairos priority-axis と Zoe
  health-only validation を含む canonical graph diagnostics を持ちます。
- `ControlRuntimeAdapter.cs` は一時的な runtime-neutral adapter interface を
  持ちます。
- `ControlStateTensorPacket.cs` は flat state tensor transport と semantic
  memory accessor を持ちます。
- `ControlActionPacket.cs` は runtime-neutral action output を持ちます。
- `ControlDecisionTracePacket.cs` は replayable decision trace packet を
  持ちます。
- その他の `DynamicPipeline*.cs` は 4-layer AST / graph / builder /
  compiler / canonical evaluator を持ちます。公開 package を更新できる段階で
  AIKernel.Control / AIKernel.Wasm へ移植する対象です。
- `control/pipeline-graph.js` は browser 側の canonical DAG compiler を
  持ちます。
- `control/zoe-veto.js` は browser 側の Zoe / SVC veto evaluator を
  持ちます。
- `control/runtime-packets.js` は packet/status construction と、staging
  された graph / veto module への compatibility delegate のみに寄せます。
