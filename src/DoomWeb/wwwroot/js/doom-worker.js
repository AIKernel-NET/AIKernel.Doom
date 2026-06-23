(function () {
  "use strict";

  self.window = self;
  self.window.requestAnimationFrame = self.window.requestAnimationFrame || function (callback) {
    return self.setTimeout(function () {
      callback(self.performance?.now?.() || Date.now());
    }, 0);
  };
  self.window.cancelAnimationFrame = self.window.cancelAnimationFrame || function (handle) {
    self.clearTimeout(handle);
  };

  const workerCacheKey = (() => {
    try {
      return new URL(self.location.href).searchParams.get("v") || "dev";
    } catch {
      return "dev";
    }
  })();
  function resolveWorkerScriptBase() {
    try {
      const url = new URL(self.location.href);
      return url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1) || "/js/";
    } catch {
      return "/js/";
    }
  }

  const workerScriptBase = resolveWorkerScriptBase();
  const scriptUrl = (path) => {
    const relativePath = String(path || "").replace(/^\/js\//, "").replace(/^\//, "");
    return `${workerScriptBase}${relativePath}?v=${encodeURIComponent(workerCacheKey)}`;
  };

  function installCanonicalBridge(module) {
    if (!module) {
      return false;
    }

    self.AIKernelWebGpu = Object.assign({}, self.AIKernelWebGpu || {}, {
      createWebGpuEnvelopeBridge: module.createWebGpuEnvelopeBridge,
      createWebGpuBrowserExecutor: module.createWebGpuBrowserExecutor,
      createNullWebGpuExecutor: module.createNullWebGpuExecutor
    });
    return true;
  }

  self.AIKernelDoomGpuAssetBase = `${workerScriptBase}aikernel/`;
  self.AIKernelWebGpuReady = import(scriptUrl("/js/aikernel/webgpu-envelope-bridge.js"))
    .then(module => installCanonicalBridge(module))
    .catch(error => {
      self.AIKernelWebGpuError = error?.message || String(error);
      console.warn("[AIKernel.Doom] canonical WebGPU bridge unavailable in worker", error);
      return false;
    });

  importScripts(
    scriptUrl("/js/autoplay-profile.js"),
    scriptUrl("/js/autoplay/gpu-contracts.js"),
    scriptUrl("/js/webgpu-provider.js"),
    scriptUrl("/js/autoplay/cognition/semantics.js"),
    scriptUrl("/js/autoplay/cognition/combat-route.js"),
    scriptUrl("/js/autoplay/cognition/routing.js"),
    scriptUrl("/js/autoplay/cognition/topos.js"),
    scriptUrl("/js/autoplay/cognition/ctg.js"),
    scriptUrl("/js/autoplay/cognition/sensory.js"),
    scriptUrl("/js/autoplay/cognition/vision-palette.js"),
    scriptUrl("/js/autoplay/cognition/phainesis.js"),
    scriptUrl("/js/autoplay/cognition/nous.js"),
    scriptUrl("/js/autoplay/cognition/phantasia.js"),
    scriptUrl("/js/autoplay/cognition/kairos.js"),
    scriptUrl("/js/autoplay/cognition/kinesis.js"),
    scriptUrl("/js/autoplay/cognition/zoe.js"),
    scriptUrl("/js/autoplay/cognition/pipeline-trace.js"),
    scriptUrl("/js/autoplay/sensor-tensor.js"),
    scriptUrl("/js/autoplay/control/objective-routing.js"),
    scriptUrl("/js/autoplay/control/expression-dsl.js"),
    scriptUrl("/js/autoplay/control/route-planner.js"),
    scriptUrl("/js/autoplay/control/route-loop-budget.js"),
    scriptUrl("/js/autoplay/control/doom-context.js"),
    scriptUrl("/js/autoplay/control/evidence.js"),
    scriptUrl("/js/autoplay/control/arbitration.js"),
    scriptUrl("/js/autoplay/control/decision-trace.js"),
    scriptUrl("/js/autoplay/control/pipeline-graph.js"),
    scriptUrl("/js/autoplay/control/zoe-veto.js"),
    scriptUrl("/js/autoplay/control/runtime-packets.js"),
    scriptUrl("/js/autoplay/wasm-state.js"),
    scriptUrl("/js/autoplay/control-runtime.js"),
    scriptUrl("/js/autoplay/doom-sensor-inputs.js"),
    scriptUrl("/js/autoplay/doom-action-adapter.js"),
    scriptUrl("/js/autoplay/doom-retry-dispatch.js"),
    scriptUrl("/js/autoplay/doom-binary-assets.js"),
    scriptUrl("/js/doom-wasm-imports.js"),
    scriptUrl("/js/doom-native-audio.js"),
    scriptUrl("/js/doom-auditory-runtime.js"),
    scriptUrl("/js/doom-wad-metadata.js"),
    scriptUrl("/js/bonsai.js"),
    scriptUrl("/js/doom-debug-audio.js"),
    scriptUrl("/js/doom.js")
  );

  let runtime = null;

  function post(type, payload, transfer) {
    self.postMessage(Object.assign({ type }, payload || {}), transfer || []);
  }

  function applyGpuModeState(gpuMode) {
    if (!gpuMode || typeof gpuMode !== "object") {
      return;
    }

    const useGpuRendering = gpuMode.useGpuRendering !== false;
    const reason = String(gpuMode.reason || (useGpuRendering ? "startup-gpu" : "startup-cpu"));
    if (typeof self.AIKernelDoomSetGpuRenderingMode === "function") {
      self.AIKernelDoomSetGpuRenderingMode(useGpuRendering, reason);
      return;
    }

    const mode = self.AIKernelDoomGpuMode || {};
    mode.useGpuRendering = useGpuRendering;
    mode.gpuPermanentlyDisabled = gpuMode.gpuPermanentlyDisabled === true || !useGpuRendering;
    mode.reason = reason;
    mode.updatedAt = Number(gpuMode.updatedAt || Date.now());
    self.AIKernelDoomGpuMode = mode;
    self.useGpuRendering = mode.useGpuRendering;
    self.gpuPermanentlyDisabled = mode.gpuPermanentlyDisabled;
  }

  function disposeWorkerGpuResources(reason = "page-transition") {
    const provider = self.WebGpuComputeProvider || self.webGpuComputeProvider || self.aikernelWebGpuComputeProvider;
    if (!provider || provider.__aikernelDoomWorkerReleaseComplete) {
      return;
    }

    provider.__aikernelDoomWorkerReleaseComplete = true;
    provider.lastError = reason;
    provider.usingCpuFallback = true;
    try {
      provider.disposeGpuResources?.();
    } catch {
    }
  }

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function toAudioCueSnapshot(snapshot) {
    return {
      leftEnergy: numberOrZero(snapshot?.leftEnergy),
      rightEnergy: numberOrZero(snapshot?.rightEnergy),
      balance: numberOrZero(snapshot?.balance),
      dominantFreq: numberOrZero(snapshot?.dominantFreq ?? snapshot?.dominantFrequency),
      eventDetected: Boolean(snapshot?.eventDetected),
      eventType: snapshot?.eventType || "spatial-event",
      timestamp: snapshot?.timestamp || new Date().toISOString()
    };
  }

  self.AIKernelWasmAudioProvider = {
    playSpatialCue(snapshot) {
      post("audio-cue", { snapshot: toAudioCueSnapshot(snapshot) });
      return true;
    },
    playPcm(payload) {
      const samples = payload?.samples instanceof Float32Array
        ? payload.samples
        : new Float32Array(payload?.samples || []);
      post("audio-pcm", {
        samples: samples.buffer,
        frames: payload?.frames || 0,
        channels: payload?.channels || 2,
        sampleRate: payload?.sampleRate || 44100,
        snapshot: toAudioCueSnapshot(payload?.snapshot || {})
      }, [samples.buffer]);
      return true;
    },
    status() {
      return {
        proxied: true,
        target: "main-thread-webaudio"
      };
    }
  };
  self.aikernelWasmAudioProvider = self.AIKernelWasmAudioProvider;

  function formatError(error) {
    if (!error) {
      return "unknown worker error";
    }

    if (error instanceof Error) {
      return error.stack || error.message;
    }

    return String(error);
  }

  async function invoke(id, method, args) {
    try {
      if (!runtime) {
        throw new Error("DOOM worker runtime is not initialized.");
      }

      const result = await runtime[method](...(args || []));
      post("response", { id, result });
    } catch (error) {
      post("response", {
        id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  self.onmessage = function (event) {
    const message = event.data || {};

    if (message.type === "init") {
      try {
        applyGpuModeState(message.gpuMode);
        runtime = new self.AIKernelDoomRuntime({
          canvas: message.canvas,
          moduleUrl: message.moduleUrl,
          modelManifestUrl: message.modelManifestUrl,
          autoplayProfileUrl: message.autoplayProfileUrl,
          log: function (tag, className, text) {
            post("log", { tag, className, text });
          },
          onStatusChange: function (status, reason) {
            post("status", { status, reason });
          }
        });
        post("ready", { status: runtime.status() });
      } catch (error) {
        post("init-error", { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (message.type === "gpu-mode") {
      applyGpuModeState(message.gpuMode);
      return;
    }

    if (message.type === "dispose-gpu") {
      disposeWorkerGpuResources(message.reason || "page-transition");
      return;
    }

    if (message.type === "call") {
      applyGpuModeState(message.gpuMode);
      invoke(message.id, message.method, message.args);
      return;
    }

    if (message.type === "input" && runtime) {
      runtime.queueInput(message.keycode, message.pressed);
    }

    if (message.type === "manual-input" && runtime) {
      if (typeof runtime.queueManualInput === "function") {
        runtime.queueManualInput(message.keycode, message.pressed, message.holdMs || 0);
      } else {
        runtime.queueInput(message.keycode, message.pressed);
      }
    }
  };

  self.onerror = function (message, source, lineno, colno, error) {
    post("fatal", {
      error: `${message || formatError(error)} at ${source || "worker"}:${lineno || 0}:${colno || 0}`,
      detail: formatError(error)
    });
  };

  self.onunhandledrejection = function (event) {
    post("fatal", {
      error: "Unhandled worker rejection",
      detail: formatError(event.reason)
    });
  };
})();
