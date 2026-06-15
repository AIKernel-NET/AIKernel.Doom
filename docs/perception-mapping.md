# Doom Perception Mapping

AIKernel.Doom owns scenario-specific mappings only. The Doom provider maps game state, sensor fusion, and autoplay commands into generic AIKernel DTOs while leaving WebGPU, WebAudio, WASM runtime, and CTG Gate evaluation to their owning packages.

## Added Surfaces

- `DoomHudSignalMapper`: maps `DoomGameState` to generic `HudSignalSet`.
- `DoomOverlayAnnotationMapper`: maps `SensorFusion` to generic overlay annotations.
- `DoomInputMappingAdapter`: maps Doom autoplay `ActionCommand` to generic virtual input DTOs.
- `DoomScenarioBenchmarkCatalog`: describes demo benchmark carriers without executing scenarios.

These are scenario-local adapters. They are not canonical interface definitions.

## Auditory and Spatial Overlay Mapping

The browser demo can display left/right auditory gauges and a spatial event
icon, but Doom remains a scenario mapper only:

- `bonsai.js` carries optional `auditorySnapshot`, `spatialSnapshot`, and
  `ctgCarrier` objects through the AutoPlay status shape.
- `doom.js` copies those snapshots into runtime status and may pass audio
  samples to the existing WebGPU state carrier.
- `doom-prompt.js` renders the L/R gauges and event icon. It does not calculate
  spatial direction or perform CTG evaluation.
- Visual plus auditory projection is owned by `AIKernel.Wasm.Spatial`.
- Browser audio playback stays muted by default and is enabled only as a debug
  option through `doom.audio on` / `doom.audio off`.

The event icon uses normalized `hudX` / `hudY` supplied by the WASM spatial
snapshot. If those coordinates are absent, the overlay falls back to a neutral
centered marker rather than deriving a direction in JavaScript.
