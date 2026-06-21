(function () {
  "use strict";

  const DEFAULT_KEYS = Object.freeze({
    forward: 0xad,
    back: 0xaf,
    left: 0xac,
    right: 0xae,
    fire: 0xa3,
    strafe: 0xb8,
    use: 0xa2,
    run: 0xb6
  });
  const MOVE_KEY_NAMES = Object.freeze(["forward", "back", "left", "right", "strafe"]);

  function keysFrom(options) {
    return options?.keys || DEFAULT_KEYS;
  }

  function normalizeAction(action, fallback, normalizer) {
    if (typeof normalizer === "function") {
      return normalizer(action, fallback) || {};
    }

    return action || {};
  }

  function moveAxis(action) {
    return action?.move === "forward" ? 1 : (action?.move === "back" ? -1 : 0);
  }

  function turnAxis(action) {
    const yaw = Number(action?.turnYaw);
    if (Number.isFinite(yaw) && yaw !== 0) {
      return yaw > 0 ? 1 : -1;
    }

    return action?.turn === "right" ? 1 : (action?.turn === "left" ? -1 : 0);
  }

  function turnDirection(action) {
    const axis = turnAxis(action);
    return axis > 0 ? "right" : (axis < 0 ? "left" : "none");
  }

  function isMoveKey(name) {
    return MOVE_KEY_NAMES.indexOf(name) >= 0;
  }

  function createInputPlan(action, options = {}) {
    const normalized = options.normalized === true
      ? (action || {})
      : normalizeAction(action, options.previousAction, options.normalizeAction);
    const aiMoveAllowed = !Boolean(options.manualMove);
    const usePressed = Boolean(options.usePressed);
    const kinesis = usePressed
      ? Object.assign({}, normalized, {
        move: "none",
        turn: "none",
        turnYaw: 0,
        fire: false,
        strafe: false,
        run: false
      })
      : normalized;
    const turn = turnDirection(kinesis);
    const desired = {
      forward: aiMoveAllowed && kinesis.move === "forward",
      back: aiMoveAllowed && kinesis.move === "back",
      left: aiMoveAllowed && turn === "left",
      right: aiMoveAllowed && turn === "right",
      fire: Boolean(kinesis.fire),
      strafe: aiMoveAllowed && Boolean(kinesis.strafe),
      use: usePressed,
      run: Boolean(kinesis.run)
    };

    return {
      normalized: kinesis,
      aiMoveAllowed,
      move: moveAxis(kinesis),
      turn: turnAxis(kinesis),
      fire: kinesis.fire ? 1 : 0,
      strafe: kinesis.strafe ? 1 : 0,
      desired
    };
  }

  function queueIfAllowed(host, keycode, pressed, name) {
    if (typeof host?.isManualInputActive === "function" && host.isManualInputActive(keycode, name)) {
      return false;
    }

    if (typeof host?.queueInput === "function") {
      host.queueInput(keycode, Boolean(pressed), name);
      return true;
    }

    return false;
  }

  function applyAction(action, host = {}) {
    const keys = keysFrom(host);
    const normalized = normalizeAction(action, host.previousAction, host.normalizeAction);
    if (host.senseOnly) {
      host.clearRetry?.();
      host.releaseInputs?.();
      return { mode: "sense-only", nativeUsed: false, queued: 0, normalized };
    }

    const usePressed = typeof host.resolveUsePulse === "function"
      ? host.resolveUsePulse(Boolean(normalized.use))
      : Boolean(normalized.use);
    const plan = createInputPlan(normalized, {
      normalized: true,
      manualMove: host.manualMove,
      usePressed
    });
    let queued = 0;

    if (typeof host.nativeAction === "function" && plan.aiMoveAllowed) {
      const result = host.nativeAction(plan.move, plan.turn, plan.fire, plan.strafe);
      if (result === host.ok) {
        queued += queueIfAllowed(host, keys.use, plan.desired.use, "use") ? 1 : 0;
        queued += queueIfAllowed(host, keys.run, plan.desired.run, "run") ? 1 : 0;
        host.playDebugAudio?.();
        return { mode: "native-action", nativeUsed: true, queued, normalized };
      }
    }

    for (const [name, keycode] of Object.entries(keys)) {
      if (host.manualMove && isMoveKey(name)) {
        continue;
      }

      queued += queueIfAllowed(host, keycode, plan.desired[name], name) ? 1 : 0;
    }

    host.playDebugAudio?.();
    return { mode: "key-events", nativeUsed: false, queued, normalized };
  }

  function releaseMoveInputs(host = {}) {
    const keys = keysFrom(host);
    let queued = 0;
    if (typeof host.nativeAction === "function") {
      host.nativeAction(0, 0, 0, 0);
    }

    for (const name of MOVE_KEY_NAMES) {
      if (typeof host.queueInput === "function" && Object.prototype.hasOwnProperty.call(keys, name)) {
        host.queueInput(keys[name], false, name);
        queued += 1;
      }
    }

    return { mode: "release-move", queued };
  }

  function releaseInputs(host = {}) {
    const keys = keysFrom(host);
    let queued = 0;
    if (typeof host.nativeAction === "function") {
      host.nativeAction(0, 0, 0, 0);
    }

    for (const [name, keycode] of Object.entries(keys)) {
      if (typeof host.queueInput === "function") {
        host.queueInput(keycode, false, name);
        queued += 1;
      }
    }

    return { mode: "release-all", queued };
  }

  self.AIKernelDoomActionAdapter = Object.freeze({
    createInputPlan,
    applyAction,
    releaseMoveInputs,
    releaseInputs,
    normalizeAction
  });
})();
