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
  const scriptUrl = (path) => `${path}?v=${encodeURIComponent(workerCacheKey)}`;

  importScripts(
    scriptUrl("/demo/doom/js/autoplay-profile.js"),
    scriptUrl("/demo/doom/js/webgpu-provider.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/semantics.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/combat-route.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/routing.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/topos.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/ctg.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/sensory.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/vision-palette.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/phainesis.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/nous.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/phantasia.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/kairos.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/kinesis.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/zoe.js"),
    scriptUrl("/demo/doom/js/autoplay/cognition/pipeline-trace.js"),
    scriptUrl("/demo/doom/js/autoplay/sensor-tensor.js"),
    scriptUrl("/demo/doom/js/autoplay/control/objective-routing.js"),
    scriptUrl("/demo/doom/js/autoplay/control/expression-dsl.js"),
    scriptUrl("/demo/doom/js/autoplay/control/route-planner.js"),
    scriptUrl("/demo/doom/js/autoplay/control/doom-context.js"),
    scriptUrl("/demo/doom/js/autoplay/control/evidence.js"),
    scriptUrl("/demo/doom/js/autoplay/control/arbitration.js"),
    scriptUrl("/demo/doom/js/autoplay/control/decision-trace.js"),
    scriptUrl("/demo/doom/js/autoplay/control/pipeline-graph.js"),
    scriptUrl("/demo/doom/js/autoplay/control/zoe-veto.js"),
    scriptUrl("/demo/doom/js/autoplay/control/runtime-packets.js"),
    scriptUrl("/demo/doom/js/autoplay/wasm-state.js"),
    scriptUrl("/demo/doom/js/autoplay/control-runtime.js"),
    scriptUrl("/demo/doom/js/autoplay/doom-sensor-inputs.js"),
    scriptUrl("/demo/doom/js/autoplay/doom-action-adapter.js"),
    scriptUrl("/demo/doom/js/autoplay/doom-retry-dispatch.js"),
    scriptUrl("/demo/doom/js/autoplay/doom-binary-assets.js"),
    scriptUrl("/demo/doom/js/doom-wasm-imports.js"),
    scriptUrl("/demo/doom/js/doom-native-audio.js"),
    scriptUrl("/demo/doom/js/doom-auditory-runtime.js"),
    scriptUrl("/demo/doom/js/doom-wad-metadata.js"),
    scriptUrl("/demo/doom/js/bonsai.js"),
    scriptUrl("/demo/doom/js/doom-debug-audio.js"),
    scriptUrl("/demo/doom/js/doom.js")
  );

  let runtime = null;

  function post(type, payload, transfer) {
    self.postMessage(Object.assign({ type }, payload || {}), transfer || []);
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

    if (message.type === "call") {
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
