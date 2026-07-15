(function () {
  "use strict";

  const MIN_CUE_INTERVAL_MS = 160;
  let lastCueAt = 0;

  function play(snapshot, options = {}) {
    if (options.muted) {
      return false;
    }

    if (!snapshot?.eventDetected || Math.max(Number(snapshot.leftEnergy || 0), Number(snapshot.rightEnergy || 0)) < 0.08) {
      return false;
    }

    const now = self.performance?.now?.() || Date.now();
    if (lastCueAt && now - lastCueAt < MIN_CUE_INTERVAL_MS) {
      return false;
    }

    lastCueAt = now;
    const bridge = self.AIKernelWasmAudioProvider || self.aikernelWasmAudioProvider;
    if (typeof bridge?.playSpatialCue !== "function") {
      return false;
    }

    bridge.playSpatialCue(snapshot);
    return true;
  }

  self.AIKernelDoomDebugAudio = {
    play,
    reset() {
      lastCueAt = 0;
    }
  };
})();
