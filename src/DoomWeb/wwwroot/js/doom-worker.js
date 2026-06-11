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
    "/demo/doom/js/webgpu-provider.js?v=20260612-doomweb4",
    "/demo/doom/js/bonsai.js?v=20260612-doomweb4",
    "/demo/doom/js/doom.js?v=20260612-doomweb4"
  );

  let runtime = null;

  function post(type, payload) {
    self.postMessage(Object.assign({ type }, payload || {}));
  }

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
