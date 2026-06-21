# Vision Perception Engine

[日本語](vision-perception-engine-ja.md)

The browser AutoPlay supervisor implements a compact perception system in
JavaScript. It is designed as a reusable example of how a visual runtime can
extract actionable state from a low-resolution game framebuffer without a full
computer-vision model.

In AIKernel terms, this engine is an Observer-facing perception layer. It
converts raw framebuffer state into bounded symbolic signals. It does not own
final gameplay decisions; those signals are routed into the Operator pipeline.

The implementation lives primarily in:

```text
src/DoomWeb/wwwroot/js/bonsai.js
src/DoomWeb/wwwroot/js/webgpu-provider.js
src/DoomWeb/wwwroot/js/doom.js
```

## Design Goals

- Avoid expensive CPU readback when WebGPU texture binding is available.
- Keep a deterministic CPU fallback for every detector.
- Extract low-dimensional state from a 320x200 paletted framebuffer.
- Separate detection from action selection.
- Make detector state visible through overlays and copyable logs.
- Keep the system tunable through an external profile.
- Keep all detector outputs inspectable through status and overlay.
- Make detector activation phase-specific so unused detectors do not influence
  unrelated decisions.

## Sampling Layers

The engine samples the framebuffer at several semantic layers.

### Screen Regions

The original coarse view is a 3x2 grid:

```text
left-top    center-top    right-top
left-bottom center-bottom right-bottom
```

This is exposed as `Screen6Regions` for the C# strategy contract and remains a
stable low-cost signal for wall pressure, open space, and lateral bias.

### 3x3 Region Grid

The newer `regions9` signal subdivides the gameplay view into a 3x3 grid:

```text
r0 r1 r2
r3 r4 r5
r6 r7 r8
```

It improves:

- corridor entrance detection,
- enemy localization,
- bridge lane detection,
- obstacle and barrel detection,
- turning vs forward-motion discrimination.

The status output includes:

```text
regions9=665654643
```

Each digit is a quantized bucket. The goal is not photorealistic perception; the
goal is a stable symbolic signature that can drive deterministic routing.

### HUD Sampling

The engine samples the DOOM status bar separately from the world view. This is
important because HUD pixels are not world geometry.

Extracted HUD signals include:

- ammo signature,
- likely-empty ammo state,
- health signature,
- zero-health likelihood,
- DOOM face signature,
- face delta.

The DOOM face is treated as a compact player-state buffer. It reflects damage,
directional hit feedback, and critical state. Keeping `faceSig` separate from
world regions prevents HUD changes from polluting wall or corridor signatures.

### Palette Semantics

The engine works on paletted 8-bit DOOM frames. It scores palette entries
against semantic color clusters:

- enemy-like colors,
- dark area,
- blue floor,
- computer room lights,
- door panels,
- bridge brown and green hazard colors,
- foot obstacles.

This is intentionally lightweight. It is fast enough for real-time debugging
and clear enough to explain in logs. That explainability is part of guideline
alignment: an Observer should produce evidence that a developer can audit.

## Quantized Signatures

Small color and motion changes can create noisy frame deltas. The engine uses
quantization to collapse tiny variations into stable buckets.

Benefits:

- palette jitter is ignored,
- wall texture detail is abstracted,
- view bobbing becomes less disruptive,
- repeated wall or corner views can be dictionary-matched,
- logs remain compact.

Example status fields:

```text
regions=665653
regions9=665654643
depthSig=7445
faceSig=0440044004400440
sig=wall/0.83
dict=48/4/7
```

`dict` represents learned signature dictionaries for wall, corner, and depth
patterns. These dictionaries let the runtime quickly recognize repeated visual
states such as known corner traps.

## Multi-Frame Motion Analysis

Single-frame comparison is unreliable in classic DOOM because the view bobs up
and down while moving. The engine keeps a small frame history and compares the
current quantized regions with a bob-filtered prior frame.

The `motion9` signature is computed from 3x3 region changes:

```text
motion9[i] = quantize(abs(currentRegion9[i] - previousRegion9[i]))
```

Derived signals:

- `forwardProgress`: central vertical motion while moving forward,
- `turningMotion`: asymmetric left/right motion,
- `obstacleMotion`: central low-region motion indicating near obstacles,
- `entranceMotion`: right-side opening or movement clue,
- `motionStallScore`: low movement despite forward intent.

These signals help distinguish:

- walking into a wall,
- turning in place,
- entering a corridor,
- being blocked by a barrel or column,
- moving along a bridge.

## Door and Computer Room Detection

Door detection is intentionally phase-gated. Seeing a door-like texture is not
enough to advance the phase.

The first-door milestone requires evidence such as:

- corridor was already located,
- Use was attempted,
- door transition was armed,
- dark sector or map hint matched,
- or computer-room visual evidence appeared after Use.

This prevents false positives such as "dark wall plus enemy color" being
treated as a successful door open.

This is a fail-closed milestone. The system would rather delay progress than
advance the semantic phase on weak evidence.

Computer room detection uses a separate visual group:

- computer panel score,
- blue light score,
- red light score,
- dark panel score,
- luma threshold,
- enemy-zone context.

This lets the system recognize the room even when the player is looking at
different parts of it.

## Enemy Detection

Enemy detection is evaluated across all regions, then action is gated by phase.

Important rules:

- enemy detection is disabled before the first door,
- green/gate-like colors are not trusted as enemies,
- brown/gray are trusted only at close depth or center confidence,
- red/pink are allowed through a looser depth gate in the dark computer room,
- Fire is emitted only when the target is centered.

This reflects DOOM gameplay: moving enemies can appear in any region, but
shooting before they are centered wastes ammunition.

## Debug Overlay

The overlay renders active detectors rather than every possible detector.

Colors:

- objective: green,
- motion: red,
- door/gap: green,
- wall: orange,
- enemy: purple,
- computer: blue,
- foot obstacle: yellow,
- HUD: gray.

Priority affects intensity. High-priority commands are drawn with stronger
glow, while low-priority background detectors are faint. This makes it possible
to see which detector is currently winning the action arbitration.

## Reuse Guidance

This perception approach is useful when:

- the source is a low-resolution framebuffer,
- direct game-state APIs are unavailable,
- deterministic behavior is preferred over opaque model output,
- a human developer must inspect and tune behavior live,
- frame readback must be minimized.

The same structure can be reused for emulator UIs, robotics simulators, old
games, browser sandboxes, and visual debugging surfaces.
