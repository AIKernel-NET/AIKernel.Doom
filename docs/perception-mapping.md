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

## Sensor Input Map

The Doom runtime carries sensor state as an extensible `sensorInputs` map rather
than a fixed array. New sensors can be added without changing the HUD toggle
loop or the status carrier shape.

| Sensor | Concept | Role |
| --- | --- | --- |
| `visual` | `Aisthesis` | Visual features and HUD-derived evidence. |
| `audio` | `Aisthesis` | Stereo energy, balance, and auditory event hints. |
| `motor` | `Kinesis` | Autoplay movement and turn intent. |
| `movement` | `Kinesis` | Derived relative movement vector fused from visual, audio, and motor evidence. |
| `compass` | `Phantasia` | Relative heading representation derived from visual, audio, movement, and motor evidence. |
| `health` | `Aisthesis` | Direct life/death evidence from health and face/HUD quantization. |
| `spatial` | `Phantasia` | Fused spatial representation and world-model output. |

The names above are ASCII-safe runtime names. Doom must not introduce new shared
contract names here; these carriers are candidates for the next AIKernel
contract elevation pass.

For the shared Sensor OS concept mapping and repository ownership rules, read
the
[Cross-Repository Developer Guide v0.1.1.1](https://github.com/AIKernel-NET/AIKernel.NET/blob/main/docs/development/cross-repository-developer-guide-v0.1.1.1.md).

## Nous Carrier

DoomWeb also exposes a scenario-local `NousCarrier` as the pre-governance
cognition carrier. It is not a Gate result and does not create Council votes.
It contains normalized sensor state, a 9x9 visual feature grid, movement and
health ternary envelopes, Bonsai ternary pattern values, and a CTG-ROM trace
with `gateExecuted=false`.

The 9x9 carrier is emitted as `vision9x9Sample` / `vision9x9Signature`. The
legacy `region9Sample` remains the compact 3x3 route-safety view for existing
debug overlays.

The two visual grids have different responsibilities:

- `region9Sample` / `region9Signature` is the coarse 3x3 screen partition.
  It is the base layer for route safety, repeated-area detection, and
  exploration entropy.
- `vision9x9Sample` / `vision9x9Signature` is the detail layer used for
  item-like color clusters, projectile-like warm clusters, and other local
  analysis that needs more spatial precision.

DoomWeb applies the resident perception algorithm semantics to those visual
layers before detector labels are emitted:

- projectile-like and resource-like pixels are scored through hue/saturation
  masks so lighting changes do not erase the signal as easily as raw RGB
  thresholds.
- projectile and resource masks use max-pooling semantics so small but
  important pixels survive the 3x3 and 9x9 reductions.
- the masks are smoothed with a small morphology pass to merge nearby fragments
  while keeping the original coarse/detail grid boundary.
- the short `Chronos` window carries temporal difference and dense-flow style
  estimates for looming detection.
- auditory snapshots carry low/mid/high band energies and a dominant band in
  addition to L/R energy and balance.

These preprocessing values remain scenario-local evidence. They do not create
Council votes, Gate decisions, reject reasons, or action commands.

## Spawn Landmark Route Evidence

The E1M1 opening room cannot reliably expose the first-door corridor through a
single direct visual cue. The demo route therefore treats opening-room landmarks
as stabilized evidence for a route hint, not as immediate control locks.

- the blue floor plus pillar evidence forms a `spawn-center-anchor` route hint.
- the east courtyard window, south secret-door brightness, and west stair lamps
  remain route hints that must stabilize before they influence objective
  promotion.
- route evidence can promote `follow-demo-route-to-first-door` into
  `locate-first-door-corridor`, but Kinesis only receives Kairos conclusions
  such as `routeAdvanceProtected`; it does not read raw landmark evidence.
- close-wall and use-contact evidence near the first door are treated as normal
  approach context so wall recovery does not fight corridor movement.

Doom's first-person view does not show the player's feet. Foot-level obstacle
handling must therefore stay differential: bottom-row flicker, visual stall, and
movement mismatch can indicate a low obstacle, but no detector should treat
"visible feet" as a stable landmark or route feature.

## Pipeline HUD Ownership

The Topos / CTG-ROM debug panel is rendered by
`doom-pipeline-panel.js`. `doom-prompt.js` loads that panel module and delegates
formatting so the prompt script remains a UI shell instead of accumulating
decision-carrier formatting logic.

The panel displays observed Logos / Pathos / Ethos values, the decision carrier,
Topos route evidence, Spatial facts, Hodos reliability, and Kairos state. It is
an observability surface only; it does not calculate decision vectors or apply
Gate logic.

`bonsai.js` also emits a display-only `pipelineTrace` carrier. The trace
summarizes the active Aisthesis, Phainesis, Nous, Topos, Kairos, Kinesis, and
Zoe stages, plus the demo route milestones:

- First Door
- Computer Room
- Central Hall
- Front Enemy
- Final Room
- Exit Switch

The trace is derived from already-produced carriers such as active detections,
Topos decisions, Kairos priority, and the last Kinesis action. It must not
become a second decision system.

When the central hall has been reached but the front enemy is not yet locked,
DoomWeb may run a short `central-hall-front-enemy-sweep` action. The sweep and
its narrow `central-hall-enemy-probe-fire` confirmation shot are planned in
`combat-route.js`, keeping `bonsai.js` as the state bridge. This is a
scenario-local Kinesis search behavior for the public demo route; enemy
engagement and defeated-state inference still use the existing combat evidence
and milestone logic. After the enemy is defeated, the same route module advances
the objective toward bridge crossing, final room entry, and the exit switch
instead of leaving the demo parked at `secure-central-hall`.

The implementation direction is to keep this JavaScript layer thin. Neutral
detectors such as `gap`, `corridorFlow`, `wallFlow`, `stuck`, `threatField`,
and `confidenceFusion` belong to `AIKernel.Wasm.Perception` as
`WasmSyntheticSensorProvider` phenomena and vectors. DoomWeb may temporarily
mirror a detector for browser-debug iteration, but the durable runtime owner is
the WASM package. Doom-specific code should map returned neutral vectors to E1M1
context only after the runtime analysis has completed.

## Nous Detector Result

DoomWeb now builds a scenario-local `NousDetectorResult` from `NousCarrier`,
`frameHistory`, `spatialHistory`, and the short `Chronos` window. It only emits
situation labels:

- `looming`
- `damageLocalization`
- `trap`
- `stuck`
- `explorationEntropy`
- `itemBacktrack`
- `sensorRecovery`

These labels are hints for a later Kairos pipeline selector. They do not create
Council votes, Gate decisions, reject reasons, or final actions.

## Health Retry Bridge

`health` is a separate retry lane, not a spatial event. When the health sensor
produces a `health-death` retry intent, DoomWeb treats it as a high-priority
runtime signal:

- `bonsai.js` emits the optional health snapshot and retry carrier.
- `doom.js` copies the carrier into runtime status, releases normal autoplay
  inputs, and dispatches a deterministic `use` / `enter` tap sequence while the
  game is running.
- `doom-prompt.js` only displays retry state in the status line.

This bridge does not evaluate CTG, reproduce Gate rules, or create
`GateDecisionKind` values. It is a scenario-specific runtime action that consumes
an already-produced retry intent.
