# Web Runtime

[日本語](web-runtime-ja.md)

`src/DoomWeb` contains the public browser runtime source assets used by the
AIKernel.Doom web prompt. It is intentionally source-only and excludes hosted
runtime binaries.

This layer is the browser-side Provider and Operator boundary. It follows the
AIKernel development guideline by keeping hosted asset load, WebGPU access,
WASM instantiation, and user input at explicit edges while keeping telemetry
visible to Observers.

## Files

```text
src/DoomWeb/
  DoomWeb.csproj
  DoomWebAssets.cs
  wwwroot/
    js/
      webgpu-provider.js
      doom.js
      doom-worker.js
      doom-worker-proxy.js
      bonsai.js
    demo/doom/
      autoplay-profile.json
      js/doom-prompt.js
      terms-and-licenses.html
```

## Main Responsibilities

`doom.js`

- loads `doom.wasm`,
- mounts `DOOM1.WAD`,
- calls `doom_init`, `doom_tick`, `doom_render`, and input exports,
- owns frame pacing and watchdog restart,
- exposes CLI-style runtime commands.

`webgpu-provider.js`

- creates the browser `WebGpuComputeProvider` bridge,
- owns texture upload/presentation when WebGPU is available,
- exposes deterministic Canvas fallback.

`doom-worker.js` and `doom-worker-proxy.js`

- isolate DOOM runtime work in a Web Worker when OffscreenCanvas is available,
- forward status, logs, commands, and manual input,
- keep the main UI thread responsive.

`bonsai.js`

- implements the perception and autoplay supervisor,
- samples the framebuffer and HUD,
- builds phase-aware state,
- emits bounded DOOM input actions,
- loads the persisted autoplay profile.

`doom-prompt.js`

- renders the AIKernel-style prompt,
- gates approval,
- provides debug controls,
- handles cheats, status commands, and copyable telemetry.

## Worker Runtime

The worker path is preferred because DOOM tick/render and perception sampling
can otherwise monopolize the UI thread. The worker receives an OffscreenCanvas
when possible and posts status/log messages back to the prompt.

Important properties:

- input remains responsive because keyboard and button events are queued,
- the runtime can degrade to main-thread execution when worker support is not
  available,
- the watchdog can restart frame loops if no frame is produced for a threshold.

## Frame Loop

The runtime uses a cooperative adaptive loop:

1. enforce a target FPS cap,
2. yield the browser event loop,
3. call `doom_tick`,
4. call `doom_render`,
5. present the framebuffer,
6. sample perception data,
7. run AutoPlay only when enabled,
8. reuse the previous action if inference is late.

The loop can lower the FPS cap when measured work time leaves no idle budget.
This keeps debug UI and manual controls usable during long sessions.

The scheduler is treated as an Operator: it executes a fixed order, applies
bounded backpressure, and reports timing state through `doom.status` rather
than hiding stalls.

## Rendering Path

The native module returns a 320x200 paletted 8-bit framebuffer.

The web runtime can present it through:

- `WebGpuComputeProvider(texture)` when WebGPU texture binding is active,
- `canvas-fallback(WebGpuComputeProvider)` when the GPU provider exists but
  texture binding is unavailable,
- Canvas-only fallback for non-WebGPU browsers.

The perception path records whether the frame stayed on the WebGPU surface:

```text
vision=webgpu-texture-binding; zeroCopy=true
vision=webgpu-state-buffer:cpu-frame-sample; zeroCopy=false
vision=cpu-frame-sample; zeroCopy=false
```

## Runtime Consent

The prompt remains suspended until the user enters an accepted approval word.
After approval, the runtime may download/cache/load:

- hosted `doom.wasm`,
- hosted shareware `DOOM1.WAD`,
- Bonsai model manifest and model file,
- related runtime metadata.

No large protected runtime asset is loaded before approval.

This is the public demo's most visible fail-closed boundary. Consent failure,
closed prompt, or any non-accepted input leaves the runtime suspended.

## Debug Controls

The debug toolbar includes:

- `Copy Logs`,
- `Phase + Logs`,
- `Manual Move`,
- `Sense Only`,
- `Detection Overlay`,
- per-detector toggles.

`Phase + Logs` executes `doom.phase.check` and `copy.logs` in one click. This
is designed for combat or door timing scenarios where typing in the prompt
would cost gameplay time.
