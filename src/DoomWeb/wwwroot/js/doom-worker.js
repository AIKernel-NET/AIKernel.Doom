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

  importScripts(
    "/demo/doom/js/webgpu-provider.js?v=20260613-doomweb86",
    "/demo/doom/js/bonsai.js?v=20260616-precision153",
    "/demo/doom/js/doom.js?v=20260616-precision153"
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
