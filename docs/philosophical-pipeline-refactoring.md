# AIKernel.Doom philosophical pipeline refactoring notes

This document records the Doom-side staging plan for the AIKernel pipeline
renaming and separation:

```text
Aisthesis -> Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe
```

## Current patch

- `DET` is now treated as a legacy UI/API compatibility label.
- The debug sensor panel is rendered as four cards:
  `Aisthesis`, `Noesis`, `Krisis`, and `Kinesis`.
- `Phainesis` owns event extraction labels formerly presented as DET:
  looming, stuck, enemy seen, entropy, and item backtrack.
- `autoplay/cognition/phainesis.js` owns the Phainomenon result shape and the
  active event projection used by Bonsai debug/status output.
- The first batch of event extraction algorithms, including looming, damage
  localization, trap, stuck, entropy, item-backtrack, and sensor-recovery
  projection, now lives in `phainesis.js`. Bonsai passes Doom-specific grace
  conditions into that module instead of owning the detector body directly.
- `Zoe` owns the HP-based veto control. The `health` detector is displayed as
  `HP Veto`.
- `autoplay/cognition/zoe.js` now owns the health-only action audit. Kinesis
  no longer receives health flags for Topos feedback mapping; Bonsai maps
  `Topos -> Kinesis`, then passes `{ action, health }` through Zoe.
- `autoplay/cognition/kairos.js` now owns the priority-axis packet consumed by
  Kinesis. Kinesis no longer recomputes Topos weights or observed scores; it
  maps `{ action, decisionVector, kairos }` into an action vector only.
- `Kairos.resolveMonitoringState` now owns abnormal-state monitoring such as
  relocalization, combat watch, use probe, recovery, and caution boosts.
  `Topos.resolveKairos` remains only as a compatibility alias.
- First-door route advancement and contact-use readiness are carried through
  the Kairos packet so the action generator does not need to read raw observed
  governance scores.
- Doom retry key sequencing remains in `doom-retry-dispatch.js` because it is
  product/runtime-specific input choreography rather than the generic Zoe
  audit itself.
- `Hodos` is no longer a top-level card. Compass evidence remains a raw
  Aisthesis sensor and is consumed by Nous/Topos display surfaces.
- `PhilosophicalPipelinePackets.cs` introduces temporary Doom-side packet
  shapes. Low-layer data packets use neutral names such as `SensorFrame`,
  `MeaningVectorPacket`, `PriorityAxes`, and `ActionVector` to satisfy the
  concept-elevation naming rule.
- `PhilosophicalPipelineInterfaces.cs` introduces temporary Doom-side
  interfaces for `IPhainesis`, `INous`, `ITopos`, `IKairos`, `IKinesis`, and
  `IZoe`.
- `PhilosophicalAutoplayPipeline` is a thin orchestrator that fixes execution
  order without changing existing autoplay behavior:
  `Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe`.
- `LegacyDetAdapter.cs` keeps the obsolete DET compatibility interface out of
  the canonical packet/interface files.

## Compatibility

- Existing `data-detection-toggle` keys remain stable so GUI tests and debug
  commands continue to work.
- `ILegacyDetAdapter` is marked `[Obsolete]` and should only be used by
  transitional adapters.
- The existing deterministic DSL behavior remains unchanged in this patch.
- `createNousDetectorResult` remains as a compatibility factory, but delegates
  to `Phainesis.createPhainomenon` when the module is loaded.
- Runtime status now exposes `phainomenon` as the primary event-extraction
  packet. `nousDetectorResult` remains as a compatibility alias for existing
  debug/API consumers.
- `Topos.resolveKairos` remains as a compatibility alias for older consumers,
  but the implementation body lives in `Kairos.resolveMonitoringState`. New
  priority-axis arbitration should go through `Kairos.resolvePriorityAxes`.

## Next extraction target

These contracts are Doom-local staging types. Product-neutral equivalents
should move into `AIKernel.Control` or `AIKernel.Wasm` during the next library
update, using abstract names and avoiding Doom-specific terminology.
