# Debugging and Telemetry

[日本語](debugging-and-telemetry-ja.md)

AIKernel.Doom includes a browser-side debugging surface because most controller
bugs only appear while the game is moving. The tooling is designed to collect
evidence quickly without forcing the developer to type commands during combat.

## Debug Toolbar

The toolbar appears below the DOOM screen.

Controls:

- `Copy Logs`: copy console, runtime status, runtime JSON, and static map hints.
- `Phase + Logs`: run `doom.phase.check`, then immediately run `copy.logs`.
- `Manual Move`: manual movement/turning, AI sensing remains active.
- `Sense Only`: AI sensing and phase routing only; all AI input suppressed.
- `Audio Off` / `Audio On`: toggles muted debug audio playback. Playback is
  muted by default and only uses an external WASM audio bridge when one is
  available.
- `Detection Overlay`: show or hide detector overlays.
- `DET:*`: toggle detector categories.

The toolbar is split into two rows:

- The operation row contains commands such as log capture, manual movement,
  sense-only mode, and debug audio playback.
- The sensor row contains generic `data-sensor-toggle` buttons backed by the
  `sensorInputs` map. The current default set is `Aisthesis Visual`,
  `Aisthesis Audio`, `Kinesis Motor`, `Kinesis Movement`, `Phantasia Compass`,
  `Phantasia Spatial`, and `Aisthesis Health`.

`Phase + Logs` is the preferred button during combat or door timing. It avoids
the time loss of typing `doom.phase.check` and `copy.logs` manually.

## Console Commands

Useful commands:

```text
doom.status
doom.phase.check
copy.logs
doom.autoplay on
doom.autoplay off
doom.autoplay manual-move toggle
doom.autoplay sense-only toggle
doom.audio toggle
doom.audio status
doom.restart-play
doom.use-test
idfa
idkfa
iddqd
```

Cheat commands are accepted through the AIKernel prompt for combat-algorithm
testing. They are DOOM inputs only; they do not execute host commands.

## Reading Phase Logs

Example:

```text
[PHASE] pipeline=ComputerRoom; objective=reach-central-hall;
det=objective,motion,computer,enemy,wall,foot,hud;
firstDoor(corr=0.50,door=0.73,opened=true,use=true/0.90);
computer(conf=0.34,dark=0.08,entered=false);
motion=000001001/f0.02/t0.17/s0.90;
action=forward/left/use=false/fire=false
```

Interpretation:

- `pipeline` tells which phase is active.
- `objective` tells what the controller is trying to achieve.
- `det` tells which detector categories are active.
- `firstDoor` shows corridor, door, opened, and Use evidence.
- `computer` shows room recognition confidence.
- `motion` shows 3x3 motion signature and derived scores.
- `action` shows the selected action summary.

## Reading Runtime Status

The long status string is dense by design. It fits into copied logs and can be
compared between runs.

Core sections:

- runtime and asset state,
- autoplay and phase state,
- semantic memory,
- strategy context and priority,
- vision path and zero-copy state,
- safety and mobility reason,
- enemy, ammo, health, and milestones,
- region, depth, face, and motion signatures,
- watchdog and GPU timing.

## Evidence Workflow

Recommended loop:

1. Enable `Sense Only`.
2. Manually move to the target scenario.
3. Press `Phase + Logs`.
4. Inspect whether the phase and objective are correct.
5. If phase is wrong, tune transition evidence.
6. If phase is right but action is wrong, disable `Sense Only` and observe the
   selected action.
7. Press `Phase + Logs` again.
8. Save screenshots when milestone success is visually ambiguous.

## Overlay Workflow

The overlay should be default-on during development.

Use it to answer:

- Is the correct detector active for this phase?
- Is a disabled detector still drawing?
- Is the high-priority action visibly stronger than background detectors?
- Is the enemy box on an enemy or on a wall texture?
- Is the objective label consistent with the expected phase?

Overlay labels intentionally include detector values so the developer can point
at a screen region and report the mismatch without decoding the full status
string.

## Auditory and Spatial HUD

The debug HUD shows stereo auditory evidence without making control decisions:

- L/R gauges visualize left and right channel energy.
- The event icon uses `spatialSnapshot.hudX` / `spatialSnapshot.hudY` supplied
  by the WASM spatial kernel.
- `doom-prompt.js` only renders the gauges and icon; it does not calculate
  spatial direction.
- `doom.js` copies `auditorySnapshot`, `spatialSnapshot`, and `ctgCarrier` into
  runtime status.
- `health-death` retry intent is shown as `retry=active|idle/cooldown/reason`.
  The retry bridge is owned by DoomWeb runtime dispatch and does not duplicate
  CTG or Gate rules.
- CTG and Gate results remain outside DoomWeb.

## Common Failure Modes

False door opened:

- `door=1` before visual transition,
- fix by tightening first-door confirmation evidence.

Door front but no Use:

- phase is `FirstDoor`,
- `useSeen=false` or `useLatch=0/armed`,
- fix aim/settle/use pulse logic.

Combat alert but no fire:

- enemy alert exists, but target is not centered,
- inspect `enemy`, `centerCellConfidence`, and `combat-alert` mobility.

Green wall treated as enemy:

- enemy cluster should be suppressed as `green` or gate-like,
- inspect enemy overlay and palette cluster.

Opening route goes to courtyard/secret side:

- inspect `court`, `gap`, and `mapRush`,
- tune OpeningHome corridor and courtyard rescue logic.
