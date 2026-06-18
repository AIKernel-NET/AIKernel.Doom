(function () {
  "use strict";

  function createState() {
    return {
      sequence: [],
      waitFrames: 0,
      cooldownFrames: 0,
      reason: "none",
      healthRetryFrames: 0
    };
  }

  function active(state) {
    return Boolean((state?.sequence?.length || 0) > 0 || (state?.waitFrames || 0) > 0);
  }

  function snapshot(state) {
    return {
      active: active(state),
      cooldownFrames: state?.cooldownFrames || 0,
      reason: state?.reason || "none"
    };
  }

  function clear(state, host = {}) {
    if (!state) {
      return snapshot(state);
    }

    state.sequence = [];
    state.waitFrames = 0;
    state.cooldownFrames = 0;
    state.reason = "none";
    if (typeof host.queueInput === "function") {
      if (host.keys?.use) {
        host.queueInput(host.keys.use, false, "use");
      }

      if (host.enterKey) {
        host.queueInput(host.enterKey, false, "enter");
      }
    }

    return snapshot(state);
  }

  function buildRetrySequence(options = {}) {
    const sequence = [];
    const keys = options.keys || {};
    const enterKey = options.enterKey || 13;
    const tapFrames = options.tapFrames || 8;
    const repeats = options.repeats || 3;

    for (let index = 0; index < repeats; index += 1) {
      sequence.push(
        { keycode: keys.use, pressed: true, name: "use" },
        { waitFrames: tapFrames },
        { keycode: keys.use, pressed: false, name: "use" },
        { waitFrames: tapFrames },
        { keycode: enterKey, pressed: true, name: "enter" },
        { waitFrames: tapFrames },
        { keycode: enterKey, pressed: false, name: "enter" },
        { waitFrames: tapFrames });
    }

    return sequence.filter(step => step.waitFrames || Number.isFinite(Number(step.keycode)));
  }

  function schedule(state, status, host = {}) {
    if (!state || host.senseOnly || host.runtimeState !== "running") {
      return { scheduled: false, reason: "inactive" };
    }

    if (state.cooldownFrames > 0) {
      state.cooldownFrames -= 1;
    }

    const healthRetryRequested = Boolean(
      status?.healthSensor?.retryRequested &&
      (status?.healthSensor?.likelyDead || status?.healthSensor?.retryReason !== "none"));
    state.healthRetryFrames = healthRetryRequested
      ? Math.min(12, Number(state.healthRetryFrames || 0) + 1)
      : 0;

    if (!healthRetryRequested) {
      if (active(state)) {
        clear(state, host);
      }

      return { scheduled: false, reason: "not-requested" };
    }

    if (state.healthRetryFrames < 3) {
      return { scheduled: false, reason: "debounce" };
    }

    if (active(state) || state.cooldownFrames > 0) {
      return { scheduled: false, reason: "busy" };
    }

    state.reason = status?.healthSensor?.retryReason || "health-death";
    host.releaseInputs?.();
    state.sequence = buildRetrySequence({
      keys: host.keys,
      enterKey: host.enterKey,
      tapFrames: host.tapFrames,
      repeats: host.repeats || 3
    });
    host.logQueued?.(state.reason);

    return { scheduled: true, reason: state.reason, queuedSteps: state.sequence.length };
  }

  function completeIfDone(state, host = {}) {
    if ((state?.sequence?.length || 0) > 0 || (state?.waitFrames || 0) > 0) {
      return false;
    }

    state.cooldownFrames = host.cooldownFrames || 180;
    host.logCompleted?.(state.reason || "none");
    return true;
  }

  function process(state, host = {}) {
    if (!state) {
      return false;
    }

    if (state.waitFrames > 0) {
      state.waitFrames -= 1;
      host.releaseMoveInputs?.();
      completeIfDone(state, host);
      return true;
    }

    if (!Array.isArray(state.sequence) || state.sequence.length <= 0) {
      return false;
    }

    const step = state.sequence.shift();
    if (step.waitFrames) {
      state.waitFrames = step.waitFrames;
      host.releaseMoveInputs?.();
      return true;
    }

    if (typeof host.queueInput === "function") {
      host.queueInput(step.keycode, step.pressed, step.name || "");
    }

    if (state.sequence.length <= 0) {
      completeIfDone(state, host);
    }

    return true;
  }

  self.AIKernelDoomRetryDispatch = Object.freeze({
    createState,
    snapshot,
    schedule,
    process,
    clear,
    buildRetrySequence
  });
})();
