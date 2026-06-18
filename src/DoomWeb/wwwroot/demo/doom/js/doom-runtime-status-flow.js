(function () {
  "use strict";

  function isSensorStatusReason(reason = "") {
    return /-sensor-(enabled|cutoff|on|off)$/.test(String(reason || ""));
  }

  function isUrgentReason(reason = "") {
    const value = String(reason || "");
    return /^(ready|running|stopped|failed|worker-|autoplay-|manual-move-|sense-only-|phase-check|download|audio-)/.test(value)
      || value.indexOf("approved") >= 0;
  }

  function hudIntervalMs(status = {}) {
    const control = status?.hudFlowControl || {};
    const configured = Number(control.minIntervalMs);
    if (Number.isFinite(configured) && configured >= 0) {
      return Math.max(16, Math.min(500, configured));
    }

    const fps = Number(status?.fps || 0);
    const targetFps = Math.max(5, Number(status?.targetFps || 30));
    const workMs = Number(status?.lastFrameWorkMs || 0);
    if ((fps > 0 && fps < targetFps * 0.6) || workMs >= 50) {
      return 250;
    }
    if ((fps > 0 && fps < targetFps * 0.8) || workMs >= 32) {
      return 125;
    }
    return 66;
  }

  function defaultNow() {
    return typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function defaultSchedule(callback, delayMs = 0) {
    if (delayMs > 0) {
      return window.setTimeout(callback, Math.max(16, Math.min(500, delayMs)));
    }

    const scheduleFrame = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : next => window.setTimeout(next, 16);
    return scheduleFrame(callback);
  }

  function createFlow(options = {}) {
    let pendingStatus = null;
    let pendingReason = "status";
    let frameHandle = 0;
    let lastPaintAt = 0;
    let droppedFrames = 0;

    const now = typeof options.now === "function" ? options.now : defaultNow;
    const schedule = typeof options.schedule === "function" ? options.schedule : defaultSchedule;

    function snapshot() {
      return {
        hasPending: Boolean(pendingStatus),
        pendingReason,
        frameHandle,
        lastPaintAt,
        droppedFrames
      };
    }

    function scheduleFlush(callbacks = {}, delayMs = 0) {
      if (frameHandle) {
        return;
      }

      frameHandle = schedule(() => flush(callbacks), delayMs);
    }

    function queue(status, reason = "status", callbacks = {}) {
      if (isSensorStatusReason(reason)) {
        callbacks.light?.(status, reason);
        return snapshot();
      }

      pendingStatus = status;
      pendingReason = reason || "status";
      scheduleFlush(callbacks);
      return snapshot();
    }

    function flush(callbacks = {}) {
      frameHandle = 0;
      const status = pendingStatus;
      const reason = pendingReason;
      pendingStatus = null;
      pendingReason = "status";
      if (!status) {
        return snapshot();
      }

      const current = now();
      const intervalMs = hudIntervalMs(status);
      const elapsedMs = current - lastPaintAt;
      if (!isUrgentReason(reason) && elapsedMs < intervalMs) {
        droppedFrames += 1;
        pendingStatus = status;
        pendingReason = reason;
        scheduleFlush(callbacks, intervalMs - elapsedMs);
        return snapshot();
      }

      lastPaintAt = current;
      callbacks.update?.(status, reason);
      return snapshot();
    }

    return Object.freeze({
      queue,
      flush,
      snapshot
    });
  }

  window.AIKernelDoomRuntimeStatusFlow = Object.freeze({
    isSensorStatusReason,
    isUrgentReason,
    hudIntervalMs,
    createFlow
  });
})();
