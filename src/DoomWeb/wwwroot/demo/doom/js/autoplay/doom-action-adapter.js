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
  const EXACT_ACTION_MODE = "csharp-exact";
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

  function actionSnapshot(action) {
    const turnYaw = Number(action?.turnYaw);
    return {
      move: typeof action?.move === "string" ? action.move : "none",
      turn: typeof action?.turn === "string" ? action.turn : "none",
      turnYaw: Number.isFinite(turnYaw) ? turnYaw : 0,
      fire: Boolean(action?.fire),
      strafe: Boolean(action?.strafe),
      use: Boolean(action?.use),
      run: Boolean(action?.run)
    };
  }

  function projectedActionSnapshot(plan) {
    const desired = plan?.desired || {};
    return {
      move: desired.forward ? "forward" : (desired.back ? "back" : "none"),
      turn: desired.right ? "right" : (desired.left ? "left" : "none"),
      turnYaw: Number(plan?.turn) || 0,
      moveAxis: Number(plan?.move) || 0,
      turnAxis: Number(plan?.turn) || 0,
      fire: Boolean(desired.fire),
      strafe: Boolean(desired.strafe),
      use: Boolean(desired.use),
      run: Boolean(desired.run)
    };
  }

  function createAppliedActionSnapshot(action, normalized, host, exactAction) {
    const proposed = actionSnapshot(action);
    const normalizedAction = actionSnapshot(normalized);

    return {
      actionMode: exactAction ? EXACT_ACTION_MODE : "legacy",
      proposed,
      normalized: normalizedAction,
      applied: projectedActionSnapshot(null),
      use: {
        proposed: proposed.use,
        normalized: normalizedAction.use,
        resolved: false,
        resolution: exactAction
          ? "exact"
          : (typeof host.resolveUsePulse === "function" ? "pulse" : "boolean"),
        pulseResolverCalled: false,
        eventQueued: false,
        blockedByManualInput: false
      },
      path: {
        selected: "pending",
        nativeAttempted: false,
        nativeAccepted: false,
        keyEventsUsed: false,
        senseOnly: Boolean(host.senseOnly)
      },
      effects: {
        normalizationBypassed: exactAction,
        usePulseBypassed: exactAction,
        useNeutralizedAction: false,
        manualMove: Boolean(host.manualMove),
        manualMoveSuppressed: false,
        manualMoveProtectedKeys: [],
        manualInputBlockedKeys: [],
        unavailableKeys: [],
        rejectedKeys: [],
        releaseInputsRequested: false
      },
      queuedKeys: []
    };
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

  function recordAppliedKey(appliedAction, name, pressed) {
    const applied = appliedAction?.applied;
    if (!applied) {
      return;
    }

    const active = Boolean(pressed);
    switch (name) {
      case "forward":
        if (active) {
          applied.move = "forward";
          applied.moveAxis = 1;
        } else if (applied.move === "forward") {
          applied.move = "none";
          applied.moveAxis = 0;
        }
        break;
      case "back":
        if (active) {
          applied.move = "back";
          applied.moveAxis = -1;
        } else if (applied.move === "back") {
          applied.move = "none";
          applied.moveAxis = 0;
        }
        break;
      case "left":
        if (active) {
          applied.turn = "left";
          applied.turnYaw = -1;
          applied.turnAxis = -1;
        } else if (applied.turn === "left") {
          applied.turn = "none";
          applied.turnYaw = 0;
          applied.turnAxis = 0;
        }
        break;
      case "right":
        if (active) {
          applied.turn = "right";
          applied.turnYaw = 1;
          applied.turnAxis = 1;
        } else if (applied.turn === "right") {
          applied.turn = "none";
          applied.turnYaw = 0;
          applied.turnAxis = 0;
        }
        break;
      case "fire":
      case "strafe":
      case "use":
      case "run":
        applied[name] = active;
        break;
      default:
        break;
    }
  }

  function queueIfAllowed(host, keycode, pressed, name, appliedAction) {
    if (typeof host?.isManualInputActive === "function" && host.isManualInputActive(keycode, name)) {
      appliedAction?.effects.manualInputBlockedKeys.push(name);
      if (name === "use" && appliedAction?.use) {
        appliedAction.use.blockedByManualInput = true;
      }
      return false;
    }

    if (typeof host?.queueInput === "function") {
      const accepted = host.queueInput(keycode, Boolean(pressed), name);
      if (accepted !== true) {
        appliedAction?.effects.rejectedKeys.push(name);
        return false;
      }

      appliedAction?.queuedKeys.push({ name, pressed: Boolean(pressed) });
      recordAppliedKey(appliedAction, name, pressed);
      if (name === "use" && appliedAction?.use) {
        appliedAction.use.eventQueued = true;
      }
      return true;
    }

    appliedAction?.effects.unavailableKeys.push(name);
    return false;
  }

  function applyAction(action, host = {}) {
    const keys = keysFrom(host);
    const exactAction = host.actionMode === EXACT_ACTION_MODE;
    const normalized = exactAction
      ? (action || {})
      : normalizeAction(action, host.previousAction, host.normalizeAction);
    const appliedAction = createAppliedActionSnapshot(action, normalized, host, exactAction);
    if (host.senseOnly) {
      host.clearRetry?.();
      host.releaseInputs?.();
      appliedAction.path.selected = "sense-only";
      appliedAction.effects.releaseInputsRequested = typeof host.releaseInputs === "function";
      return { mode: "sense-only", nativeUsed: false, queued: 0, normalized, appliedAction };
    }

    const usePressed = exactAction
      ? Boolean(normalized.use)
      : (typeof host.resolveUsePulse === "function"
          ? host.resolveUsePulse(Boolean(normalized.use))
          : Boolean(normalized.use));
    appliedAction.use.resolved = Boolean(usePressed);
    appliedAction.use.pulseResolverCalled = !exactAction && typeof host.resolveUsePulse === "function";
    const normalizedMotionRequested = moveAxis(normalized) !== 0
      || turnAxis(normalized) !== 0
      || Boolean(normalized?.strafe);
    appliedAction.effects.useNeutralizedAction = Boolean(usePressed) && (
      normalizedMotionRequested
      || Boolean(normalized?.fire)
      || Boolean(normalized?.strafe)
      || Boolean(normalized?.run)
    );
    appliedAction.effects.manualMoveSuppressed = Boolean(host.manualMove)
      && !Boolean(usePressed)
      && normalizedMotionRequested;
    const plan = createInputPlan(normalized, {
      normalized: true,
      manualMove: host.manualMove,
      usePressed
    });
    let queued = 0;

    if (typeof host.nativeAction === "function" && plan.aiMoveAllowed) {
      appliedAction.path.nativeAttempted = true;
      const result = host.nativeAction(plan.move, plan.turn, plan.fire, plan.strafe);
      if (result === host.ok) {
        appliedAction.path.selected = "native-action";
        appliedAction.path.nativeAccepted = true;
        appliedAction.applied = projectedActionSnapshot(plan);
        appliedAction.applied.use = false;
        appliedAction.applied.run = false;
        queued += queueIfAllowed(host, keys.use, plan.desired.use, "use", appliedAction) ? 1 : 0;
        queued += queueIfAllowed(host, keys.run, plan.desired.run, "run", appliedAction) ? 1 : 0;
        host.playDebugAudio?.();
        return { mode: "native-action", nativeUsed: true, queued, normalized, appliedAction };
      }
    }

    appliedAction.path.selected = "key-events";
    appliedAction.path.keyEventsUsed = true;
    appliedAction.applied = projectedActionSnapshot(null);
    for (const [name, keycode] of Object.entries(keys)) {
      if (host.manualMove && isMoveKey(name)) {
        appliedAction.effects.manualMoveProtectedKeys.push(name);
        continue;
      }

      queued += queueIfAllowed(host, keycode, plan.desired[name], name, appliedAction) ? 1 : 0;
    }

    host.playDebugAudio?.();
    return { mode: "key-events", nativeUsed: false, queued, normalized, appliedAction };
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
    EXACT_ACTION_MODE,
    createInputPlan,
    applyAction,
    releaseMoveInputs,
    releaseInputs,
    normalizeAction
  });
})();
