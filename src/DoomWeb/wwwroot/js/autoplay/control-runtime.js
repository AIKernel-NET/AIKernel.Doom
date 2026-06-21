(function () {
  "use strict";

  const CONTROL_RUNTIME_ID = "doom-scoped-control-runtime-shim";
  const USE_PULSE_COOLDOWN_FRAMES = 72;
  const USE_PULSE_HOLD_FRAMES = 3;

  function requireExpressionDsl(name) {
    const fn = self.AIKernelDoomExpressionDsl?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomExpressionDsl.${name} is not available.`);
    }

    return fn;
  }

  function requireDecisionTrace(name) {
    const fn = self.AIKernelDoomDecisionTrace?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomDecisionTrace.${name} is not available.`);
    }

    return fn;
  }

  function requireControlEvidence(name) {
    const fn = self.AIKernelDoomControlEvidence?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlEvidence.${name} is not available.`);
    }

    return fn;
  }

  function requireControlContext(name) {
    const fn = self.AIKernelDoomControlContext?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlContext.${name} is not available.`);
    }

    return fn;
  }

  function requireControlArbitration(name) {
    const fn = self.AIKernelDoomControlArbitration?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlArbitration.${name} is not available.`);
    }

    return fn;
  }

  function requireRuntimePackets(name) {
    const fn = self.AIKernelDoomControlRuntimePackets?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlRuntimePackets.${name} is not available.`);
    }

    return fn;
  }

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function buildContext(profile, state) {
    return requireControlContext("createContext")(profile, state);
  }

  function valueOf(context, token) {
    return requireExpressionDsl("valueOf")(context, token);
  }

  function evaluateWhen(context, expression) {
    return requireExpressionDsl("evaluateWhen")(context, expression);
  }

  function evidenceScore(context, stage) {
    return requireControlEvidence("evidenceScore")(context, stage);
  }

  function actionFromStage(context, stage) {
    return requireRuntimePackets("actionFromStage")(context, stage, {
      controller: "control-runtime-shim",
      evaluateWhen,
      valueOf,
      number,
      evidenceScore,
      semanticScores
    });
  }

  function idleAction(state, profile) {
    return requireRuntimePackets("idleAction")(state, profile, {
      controller: "control-runtime-shim",
      semanticScores
    });
  }

  function applyZoeVeto(action, state, profile) {
    return requireRuntimePackets("applyZoeVeto")(action, state, profile, {
      controller: "control-runtime-shim",
      evaluateWhen,
      buildContext
    });
  }

  function semanticScores(state, profile) {
    return requireControlEvidence("semanticScores")(state, profile);
  }

  function compileCanonicalGraph(profile) {
    return requireRuntimePackets("compileCanonicalGraph")(profile);
  }

  function normalizeActionPart(value, fallback = "none") {
    const text = String(value || fallback).trim().toLowerCase();
    return text || fallback;
  }

  function actionSignature(action) {
    const move = normalizeActionPart(action?.move);
    const turn = normalizeActionPart(action?.turn);
    return [
      move,
      turn,
      action?.strafe ? "s" : "-",
      action?.run ? "r" : "-",
      action?.use ? "u" : "-",
      action?.fire ? "f" : "-"
    ].join(":");
  }

  function updateRepeatCounters(runtime, action) {
    const move = normalizeActionPart(action?.move);
    const turn = normalizeActionPart(action?.turn);
    const trackable = !action?.fire
      && !action?.use
      && (move !== "none" || turn !== "none" || action?.strafe || action?.run);
    if (!trackable) {
      runtime.actionSignature = "";
      runtime.actionRepeatFrames = 0;
      runtime.moveSignature = "";
      runtime.moveRepeatFrames = 0;
      runtime.turnSignature = "";
      runtime.turnRepeatFrames = 0;
      return;
    }

    const signature = actionSignature(action);
    runtime.actionRepeatFrames = signature === runtime.actionSignature
      ? Math.min(240, number(runtime.actionRepeatFrames, 0) + 1)
      : 1;
    runtime.actionSignature = signature;

    runtime.moveRepeatFrames = move !== "none"
      ? (move === runtime.moveSignature ? Math.min(240, number(runtime.moveRepeatFrames, 0) + 1) : 1)
      : 0;
    runtime.moveSignature = move !== "none" ? move : "";

    runtime.turnRepeatFrames = turn !== "none"
      ? (turn === runtime.turnSignature ? Math.min(240, number(runtime.turnRepeatFrames, 0) + 1) : 1)
      : 0;
    runtime.turnSignature = turn !== "none" ? turn : "";
  }

  function tickUsePulseCooldown(runtime) {
    runtime.usePulseCooldown = Math.max(0, number(runtime.usePulseCooldown, 0) - 1);
  }

  function suppressUse(action) {
    return Object.assign({}, action || {}, {
      use: false,
      useKey: false
    });
  }

  function stopForUsePulse(action) {
    return Object.assign({}, action || {}, {
      move: "none",
      turn: "none",
      turnYaw: 0,
      fire: false,
      strafe: false,
      run: false,
      use: true,
      useKey: true
    });
  }

  function applyUsePulseGate(runtime, action) {
    if (number(runtime.usePulseHoldFrames, 0) > 0) {
      runtime.usePulseHoldFrames = Math.max(0, number(runtime.usePulseHoldFrames, 0) - 1);
      return stopForUsePulse(action);
    }

    if (!action?.use) {
      return action;
    }

    if (number(runtime.usePulseCooldown, 0) > 0) {
      runtime.usePulseSuppressedFrames = Math.min(240, number(runtime.usePulseSuppressedFrames, 0) + 1);
      return suppressUse(action);
    }

    runtime.usePulseCooldown = USE_PULSE_COOLDOWN_FRAMES;
    runtime.usePulseSuppressedFrames = 0;
    runtime.lastUsePulsePrediction = number(runtime.predictions, 0);
    runtime.usePulseHoldFrames = Math.max(0, USE_PULSE_HOLD_FRAMES - 1);
    return stopForUsePulse(action);
  }

  function buildStatusContext(profile, sourceState, context, runtime) {
    const actionRepeatFrames = Math.max(
      number(context?.values?.actionRepeatFrames ?? sourceState?.actionRepeatFrames ?? sourceState?.kinesisActionRepeatFrames, 0),
      number(runtime.actionRepeatFrames, 0));
    const moveRepeatFrames = Math.max(
      number(context?.values?.moveRepeatFrames ?? sourceState?.moveRepeatFrames ?? sourceState?.kinesisMoveRepeatFrames, 0),
      number(runtime.moveRepeatFrames, 0));
    const turnRepeatFrames = Math.max(
      number(context?.values?.turnRepeatFrames ?? sourceState?.turnRepeatFrames ?? sourceState?.kinesisTurnRepeatFrames, 0),
      number(runtime.turnRepeatFrames, 0));
    return buildContext(profile, Object.assign({}, sourceState || {}, {
      predictions: context?.values?.predictions ?? runtime.predictions,
      previousRouteMode: context?.values?.routeMode || sourceState?.previousRouteMode || runtime.lastStatus?.autoplayState?.routeMode || runtime.lastStatus?.debugRouteValues?.routeMode || "none",
      routeCorridorBridgeLockFrames: Math.max(
        number(context?.values?.routeCorridorBridgeLockFrames ?? sourceState?.routeCorridorBridgeLockFrames, 0),
        number(runtime.lastStatus?.autoplayState?.routeCorridorBridgeLockFrames ?? runtime.lastStatus?.debugRouteValues?.routeCorridorBridgeLockFrames, 0)),
      routePostDoorBridgeDoorMemoryFrames: Math.max(
        number(context?.values?.routePostDoorBridgeDoorMemoryFrames ?? sourceState?.routePostDoorBridgeDoorMemoryFrames, 0),
        number(runtime.lastStatus?.autoplayState?.routePostDoorBridgeDoorMemoryFrames ?? runtime.lastStatus?.debugRouteValues?.routePostDoorBridgeDoorMemoryFrames, 0)),
      kinesisActionRepeatFrames: actionRepeatFrames,
      actionRepeatFrames,
      kinesisMoveRepeatFrames: moveRepeatFrames,
      moveRepeatFrames,
      kinesisTurnRepeatFrames: turnRepeatFrames,
      turnRepeatFrames,
      usePulseCooldown: Math.max(
        number(context?.values?.usePulseCooldown ?? sourceState?.usePulseCooldown ?? sourceState?.autoplayUsePulseCooldown, 0),
        number(runtime.usePulseCooldown, 0)),
      usePulseHoldFrames: number(runtime.usePulseHoldFrames, 0),
      usePulseSuppressedFrames: number(runtime.usePulseSuppressedFrames, 0),
      lastUsePulsePrediction: number(runtime.lastUsePulsePrediction, -1)
    }));
  }

  function buildPredictionState(sourceState, runtime) {
    const actionRepeatFrames = Math.max(
      number(sourceState?.kinesisActionRepeatFrames ?? sourceState?.actionRepeatFrames ?? sourceState?.repeatActionFrames, 0),
      number(runtime.actionRepeatFrames, 0));
    const moveRepeatFrames = Math.max(
      number(sourceState?.kinesisMoveRepeatFrames ?? sourceState?.moveRepeatFrames, 0),
      number(runtime.moveRepeatFrames, 0));
    const turnRepeatFrames = Math.max(
      number(sourceState?.kinesisTurnRepeatFrames ?? sourceState?.turnRepeatFrames ?? sourceState?.repeatTurnFrames, 0),
      number(runtime.turnRepeatFrames, 0));
    return Object.assign({}, sourceState || {}, {
      predictions: runtime.predictions,
      previousRouteMode: sourceState?.previousRouteMode || runtime.lastStatus?.autoplayState?.routeMode || runtime.lastStatus?.debugRouteValues?.routeMode || "none",
      routeCorridorBridgeLockFrames: Math.max(
        number(sourceState?.routeCorridorBridgeLockFrames, 0),
        number(runtime.lastStatus?.autoplayState?.routeCorridorBridgeLockFrames ?? runtime.lastStatus?.debugRouteValues?.routeCorridorBridgeLockFrames, 0)),
      routePostDoorBridgeDoorMemoryFrames: Math.max(
        number(sourceState?.routePostDoorBridgeDoorMemoryFrames, 0),
        number(runtime.lastStatus?.autoplayState?.routePostDoorBridgeDoorMemoryFrames ?? runtime.lastStatus?.debugRouteValues?.routePostDoorBridgeDoorMemoryFrames, 0)),
      kinesisActionRepeatFrames: actionRepeatFrames,
      actionRepeatFrames,
      kinesisMoveRepeatFrames: moveRepeatFrames,
      moveRepeatFrames,
      kinesisTurnRepeatFrames: turnRepeatFrames,
      turnRepeatFrames,
      usePulseCooldown: Math.max(
        number(sourceState?.usePulseCooldown ?? sourceState?.autoplayUsePulseCooldown, 0),
        number(runtime.usePulseCooldown, 0)),
      usePulseHoldFrames: number(runtime.usePulseHoldFrames, 0),
      usePulseSuppressedFrames: number(runtime.usePulseSuppressedFrames, 0),
      lastUsePulsePrediction: number(runtime.lastUsePulsePrediction, -1)
    });
  }

  function compile(profile) {
    const pipeline = profile?.pipeline || {};
    const defaultThreshold = number(pipeline?.arbitration?.defaultThreshold, 0);
    const stages = requireControlArbitration("sortStages")(pipeline.stages, number);
    const graph = compileCanonicalGraph(profile);

    return {
      id: CONTROL_RUNTIME_ID,
      strategyName: pipeline.name || profile?.strategyName || "DynamicPipeline",
      graph,
      predict(state) {
        tickUsePulseCooldown(this);
        const sourceState = state || {};
        const context = buildContext(profile, buildPredictionState(sourceState, this));
        const arbitration = requireControlArbitration("evaluateStages")(context, stages, {
          defaultThreshold,
          number,
          evaluateWhen,
          evidenceScore
        });
        const evaluations = arbitration.evaluations;
        if (arbitration.selectedStage) {
          this.lastAction = applyUsePulseGate(this, applyZoeVeto(actionFromStage(context, arbitration.selectedStage), state || {}, profile));
          updateRepeatCounters(this, this.lastAction);
          const statusContext = buildStatusContext(profile, sourceState, context, this);
          this.predictions += 1;
          this.lastStatus = statusFromAction(this.lastAction, evaluations, statusContext, this.predictions);
          return this.lastAction;
        }

        this.lastAction = applyUsePulseGate(this, applyZoeVeto(idleAction(state || {}, profile), state || {}, profile));
        updateRepeatCounters(this, this.lastAction);
        const statusContext = buildStatusContext(profile, sourceState, context, this);
        this.predictions += 1;
        this.lastStatus = statusFromAction(this.lastAction, evaluations, statusContext, this.predictions);
        return this.lastAction;
      },
      status() {
        if (this.lastStatus) {
          return this.lastStatus;
        }

        return requireRuntimePackets("initializedStatus")({
          strategyName: this.strategyName,
          controller: "control-runtime-shim",
          runtimeId: CONTROL_RUNTIME_ID,
          graph: this.graph,
          predictions: this.predictions,
          createDecisionTrace: requireDecisionTrace("createPacket")
        });
      },
      predictions: 0,
      lastAction: null,
      lastStatus: null,
      actionSignature: "",
      actionRepeatFrames: 0,
      moveSignature: "",
      moveRepeatFrames: 0,
      turnSignature: "",
      turnRepeatFrames: 0,
      usePulseCooldown: 0,
      usePulseHoldFrames: 0,
      usePulseSuppressedFrames: 0,
      lastUsePulsePrediction: -1
    };
  }

  function statusFromAction(action, evaluations, context, predictions) {
    return requireRuntimePackets("statusFromAction")(action, evaluations, context, predictions, {
      runtimeId: CONTROL_RUNTIME_ID,
      controller: "control-runtime-shim",
      graph: context?.profile ? compileCanonicalGraph(context.profile) : null,
      createDecisionTrace: requireDecisionTrace("createPacket")
    });
  }

  self.AIKernelDoomControlRuntime = Object.freeze({
    runtimeId: CONTROL_RUNTIME_ID,
    create: compile
  });
})();
