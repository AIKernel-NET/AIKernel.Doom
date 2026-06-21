# Development Methodology

[日本語](development-methodology-ja.md)

AIKernel.Doom was developed as a human-in-the-loop AI control experiment. The
important lesson is not only the final code, but the workflow used to make a
visual control system less brittle.

The workflow intentionally follows the AIKernel Development Guidelines. It
starts from contracts, keeps side effects behind Providers, records evidence
through Observers, and moves from raw behavior to deterministic Operators and
profiles.

## Core Idea

The project treats gameplay as an AIKernel-style runtime:

- the game is a process,
- the framebuffer is an observation stream,
- the HUD is a state buffer,
- the controller is an Operator,
- the debug overlay is an Observer,
- runtime assets and WebGPU are Providers.

This framing made the development tractable. Bugs could be classified as
Provider failures, Observer failures, or Operator failures instead of being
described only as "the AI got confused."

The AI does not need to be fully autonomous from the first iteration. It can be
taught through controlled observation, manual intervention, telemetry, and
profile updates.

## Development Loop

The loop used in this repository:

```text
manual scenario setup
  -> Sense Only validation
  -> Phase + Logs capture
  -> screenshot if needed
  -> diagnose phase vs action error
  -> adjust detector / phase / action policy
  -> deploy web asset
  -> repeat
```

This loop separates two questions:

1. Did the system understand where it is?
2. Given that understanding, did it choose the right action?

Most early failures were caused by mixing these questions. For example, a door
failure could be a visual detector issue, an action-arbiter issue, a Use timing
issue, or a phase transition issue. The workflow forces each hypothesis to be
tested independently.

This is the same discipline as guideline-driven AIKernel development: do not
fix an Operator problem by adding hidden Provider state, and do not fix an
Observer problem by weakening fail-closed transitions.

## Sense Only First

`Sense Only` is the most important debug mode.

It allows the user to play manually while the perception engine and phase router
continue to run. This makes it possible to verify:

- whether the first door is recognized only when actually open,
- whether computer room features appear after crossing the door,
- whether enemy detection is disabled before enemies exist,
- whether bridge detection is active only in the bridge phase.

If `Sense Only` is wrong, do not tune actions yet. Fix perception or phase
routing first.

## Manual Move Mode

`Manual Move` cuts AI movement while keeping sensing, Use, and Fire available.
It is useful when the controller reaches a scenario but movement jitter prevents
clean testing.

Use it to isolate:

- door Use timing,
- combat Fire gating,
- exit switch activation,
- detector correctness while standing still or moving slowly.

## Static Map Knowledge Plus Runtime Vision

The controller combines two knowledge sources:

- static WAD-derived hints such as door lines, sectors, things, and switches,
- live framebuffer-derived signatures such as corridor, door, enemy, and HUD.

Static hints prevent impossible interpretations. Live vision handles the actual
camera state. Neither is sufficient alone.

Example:

- Static map says a door exists in the route.
- Vision says the player is facing a door panel.
- Use was pulsed.
- A visual transition and computer-room evidence appear.
- Only then should `doorOpenedCount` advance.

## Milestones Must Be Conservative

False positives are more damaging than late positives. A false `door=1` moves
the pipeline to `ComputerRoom`, enabling combat and disabling first-door logic
while the player is still outside. The methodology therefore prefers
multi-signal milestone confirmation:

```text
Use attempted
  + transition armed
  + visual room evidence
  + optional map match
```

This pattern should be reused for later milestones such as central hall,
bridge, second door, final room, and exit switch.

## Profile-Driven Tuning

Parameters should migrate out of ad hoc code into an autoplay profile when they
become stable enough to tune.

Examples:

- door aim tolerance,
- Use hold frames,
- dark zone thresholds,
- combat confidence thresholds,
- map rush correction windows,
- bridge hazard thresholds.

The optimizer writes the selected profile to:

```text
src/DoomWeb/wwwroot/demo/doom/autoplay-profile.json
```

The browser runtime loads this profile after consent and applies it to the
AutoPlay supervisor.

## Observer ROM

`DoomOptimizer` provides a source-side optimization harness. It can run a
deterministic Observer ROM simulation or drive a browser instance through a
debug endpoint.

The intent is not to replace human testing. The intent is to preserve useful
profile candidates and replay telemetry so progress does not depend on memory.

## Evidence Standards

Milestone claims should include evidence:

- copied runtime JSON,
- phase check output,
- relevant screenshot,
- action selected,
- detector state,
- whether `Sense Only` or `Manual Move` was active.

This evidence requirement mirrors Observer ROM practice. A milestone is not
accepted because the system said it happened; it is accepted when telemetry and
visual evidence agree.

This is especially important for enemy defeat and door-open detection, where
visual false positives are easy.

## Applying The Method Elsewhere

The same method can be applied to other AIKernel demos:

1. expose process state through a compact status surface,
2. add a Sense Only mode,
3. add manual override controls,
4. render detector overlays,
5. create one-click evidence capture,
6. split logic into phases,
7. make milestones conservative,
8. persist successful parameters.

The result is a practical workflow for developing AI control systems before a
large model can reliably infer all state by itself.
