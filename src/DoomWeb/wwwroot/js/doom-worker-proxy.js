(function () {
  "use strict";

  class AIKernelDoomWorkerProxy {
    constructor(options) {
      this.canvas = options.canvas;
      this.onLog = options.log || function () {};
      this.onStatusChange = options.onStatusChange || function () {};
      this.statusCache = {
        state: "suspended",
        renderer: "worker-pending",
        wasmLoaded: false,
        wadLoaded: false,
        wadMounted: false,
        modelLoaded: false,
        loopActive: false,
        frameCount: 0,
        fps: 0,
        targetFps: 30,
        inputReady: false,
        framebuffer: "320x200 paletted-8bit",
        lastError: ""
      };
      this.requests = new Map();
      this.nextId = 1;
      this.worker = new Worker("/demo/doom/js/doom-worker.js?v=20260613-doomweb86", { name: "AIKernel.Doom" });
      this.ready = new Promise((resolve, reject) => {
        this.resolveReady = resolve;
        this.rejectReady = reject;
      });

      this.worker.onmessage = event => this.handleMessage(event.data || {});
      this.worker.onerror = event => {
        const message = event.message || "DOOM worker failed.";
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "failed",
          lastError: message
        });
        this.rejectReady?.(new Error(message));
        this.rejectAll(message);
        this.onStatusChange(this.statusCache, "worker-error");
      };

      const offscreen = this.canvas.transferControlToOffscreen();
      this.worker.postMessage({
        type: "init",
        canvas: offscreen,
        moduleUrl: options.moduleUrl,
        modelManifestUrl: options.modelManifestUrl,
        autoplayProfileUrl: options.autoplayProfileUrl
      }, [offscreen]);
    }

    handleMessage(message) {
      if (message.type === "ready") {
        this.statusCache = this.normalizeStatus(message.status || {});
        this.resolveReady?.(this.statusCache);
        this.onLog("[WORKER]", "log-ok", "DOOM runtime isolated in Web Worker with OffscreenCanvas.");
        this.onStatusChange(this.statusCache, "worker-ready");
        return;
      }

      if (message.type === "init-error") {
        const error = message.error || "DOOM worker initialization failed.";
        this.statusCache = Object.assign({}, this.statusCache, { state: "failed", lastError: error });
        this.rejectReady?.(new Error(error));
        this.rejectAll(error);
        this.onStatusChange(this.statusCache, "worker-init-error");
        return;
      }

      if (message.type === "fatal") {
        const error = message.detail || message.error || "DOOM worker fatal error.";
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "failed",
          loopActive: false,
          lastError: error
        });
        this.rejectAll(error);
        this.onLog("[WORKER]", "log-fail", error);
        this.onStatusChange(this.statusCache, "worker-fatal");
        return;
      }

      if (message.type === "log") {
        this.onLog(message.tag, message.className, message.text);
        return;
      }

      if (message.type === "status") {
        this.statusCache = this.normalizeStatus(message.status || {});
        this.onStatusChange(this.statusCache, message.reason);
        return;
      }

      if (message.type === "response") {
        const request = this.requests.get(message.id);
        if (!request) {
          return;
        }

        this.requests.delete(message.id);
        if (message.error) {
          request.reject(new Error(message.error));
        } else {
          this.statusCache = this.normalizeStatus(message.result || {});
          request.resolve(this.statusCache);
        }
      }
    }

    normalizeStatus(status) {
      const renderer = status.renderer || this.statusCache.renderer || "canvas";
      const workerRenderer = renderer.includes("worker") ? renderer : `${renderer} worker`;
      return Object.assign({}, this.statusCache, status, {
        renderer: workerRenderer,
        executionThread: "worker"
      });
    }

    rejectAll(message) {
      for (const request of this.requests.values()) {
        request.reject(new Error(message));
      }
      this.requests.clear();
    }

    async call(method, args) {
      await this.ready;
      const id = this.nextId++;
      const promise = new Promise((resolve, reject) => {
        this.requests.set(id, { resolve, reject });
      });
      this.worker.postMessage({ type: "call", id, method, args: args || [] });
      return promise;
    }

    prepare() {
      return this.call("prepare");
    }

    start() {
      return this.call("start");
    }

    stop() {
      return this.call("stop");
    }

    setAutoplay(enabled) {
      return this.call("setAutoplay", [enabled]);
    }

    setAutoplayManualMove(enabled) {
      return this.call("setAutoplayManualMove", [enabled]);
    }

    setAutoplaySenseOnly(enabled) {
      return this.call("setAutoplaySenseOnly", [enabled]);
    }

    status() {
      return this.statusCache;
    }

    queueInput(keycode, pressed) {
      if (!this.worker || this.statusCache.state !== "running") {
        return false;
      }

      this.worker.postMessage({ type: "input", keycode, pressed });
      return true;
    }

    queueManualInput(keycode, pressed, holdMs = 0) {
      if (!this.worker || this.statusCache.state !== "running") {
        return false;
      }

      this.worker.postMessage({ type: "manual-input", keycode, pressed, holdMs });
      return true;
    }
  }

  function canUseWorkerRuntime(canvas) {
    return Boolean(
      window.Worker &&
      window.OffscreenCanvas &&
      canvas?.transferControlToOffscreen
    );
  }

  window.createAIKernelDoomRuntime = function createAIKernelDoomRuntime(options) {
    if (canUseWorkerRuntime(options.canvas)) {
      return new AIKernelDoomWorkerProxy(options);
    }

    if (window.AIKernelDoomRuntime) {
      return new window.AIKernelDoomRuntime(options);
    }

    return null;
  };
})();
