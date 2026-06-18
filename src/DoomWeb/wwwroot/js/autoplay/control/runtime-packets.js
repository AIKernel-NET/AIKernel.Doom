(function () {
  "use strict";

  const DEFAULT_CONTROLLER = "control-runtime-shim";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`AIKernelDoomControlRuntimePackets requires ${name}.`);
    }

    return value;
  }

  function turnFromYaw(yaw, numberFn = number) {
    const value = numberFn(yaw, 0);
    return value > 0 ? "right" : (value < 0 ? "left" : "none");
  }

  function strategyNameFromContext(context, fallback) {
    return context?.profile?.pipeline?.name || context?.profile?.strategyName || fallback || "DynamicPipeline";
  }

  function actionFromStage(context, stage, helpers = {}) {
    const evaluateWhen = requireFunction(helpers.evaluateWhen, "helpers.evaluateWhen");
    const valueOf = requireFunction(helpers.valueOf, "helpers.valueOf");
    const numberFn = helpers.number || number;
    const evidenceScore = helpers.evidenceScore || (() => 0);
    const semanticScores = helpers.semanticScores || (() => ({}));
    const action = stage?.action || {};
    const moveForward = evaluateWhen(context, action.moveForward);
    const moveBackward = evaluateWhen(context, action.moveBackward);
    const turnYaw = valueOf(context, action.turnYaw || "0");

    return {
      move: moveBackward ? "back" : (moveForward ? "forward" : "none"),
      turn: turnFromYaw(turnYaw, numberFn),
      fire: evaluateWhen(context, action.attackKey),
      strafe: evaluateWhen(context, action.strafeLeft) || evaluateWhen(context, action.strafeRight),
      use: evaluateWhen(context, action.useKey),
      run: evaluateWhen(context, action.runKey),
      source: helpers.controller || DEFAULT_CONTROLLER,
      pipeline: stage?.id || "none",
      stage: stage?.id || "none",
      objective: stage?.objective || "idle",
      strategyPriority: numberFn(stage?.priority, 0),
      evidenceScore: evidenceScore(context, stage),
      semanticScores: semanticScores(context?.state, context?.profile)
    };
  }

  function idleAction(state, profile, helpers = {}) {
    const semanticScores = helpers.semanticScores || (() => ({}));
    return {
      move: "none",
      turn: "none",
      fire: false,
      strafe: false,
      use: false,
      run: false,
      source: helpers.controller || DEFAULT_CONTROLLER,
      pipeline: "none",
      stage: "none",
      objective: "idle",
      strategyPriority: 0,
      evidenceScore: 0,
      semanticScores: semanticScores(state || {}, profile)
    };
  }

  function statusFromAction(action, evaluations, context, predictions, helpers = {}) {
    const createDecisionTrace = requireFunction(helpers.createDecisionTrace, "helpers.createDecisionTrace");
    const runtimeId = helpers.runtimeId || "control-runtime";
    const controller = helpers.controller || DEFAULT_CONTROLLER;
    const stageEvaluations = Array.isArray(evaluations) ? evaluations : [];
    const strategyName = strategyNameFromContext(context, helpers.strategyName);
    const decisionTrace = createDecisionTrace({
      runtimeId,
      controller,
      strategyName,
      pipeline: action?.pipeline || "none",
      stage: action?.stage || "none",
      objective: action?.objective || "idle",
      priority: number(action?.strategyPriority, 0),
      evidenceScore: number(action?.evidenceScore, 0),
      semanticScores: action?.semanticScores || {},
      stageEvaluations,
      predictions: predictions || 0
    });

    return {
      strategyName,
      controller,
      runtimeId,
      controlPipeline: action?.pipeline || "none",
      stage: action?.stage || "none",
      objective: action?.objective || "idle",
      strategyPriority: number(action?.strategyPriority, 0),
      evidenceScore: number(action?.evidenceScore, 0),
      decisionTrace,
      semanticScores: action?.semanticScores || {},
      stageEvaluations,
      predictions: predictions || 0,
      lastLatencyMs: 0,
      lastError: "",
      safetyReason: "none"
    };
  }

  function initializedStatus(options = {}) {
    const createDecisionTrace = requireFunction(options.createDecisionTrace, "options.createDecisionTrace");
    const runtimeId = options.runtimeId || "control-runtime";
    const controller = options.controller || DEFAULT_CONTROLLER;
    const strategyName = options.strategyName || "DynamicPipeline";
    const predictions = options.predictions || 0;
    const decisionTrace = createDecisionTrace({
      runtimeId,
      controller,
      strategyName,
      pipeline: "initialized",
      stage: "initialized",
      objective: "idle",
      priority: 0,
      evidenceScore: 0,
      semanticScores: {},
      stageEvaluations: [],
      predictions
    });

    return {
      strategyName,
      controller,
      runtimeId,
      controlPipeline: "initialized",
      stage: "initialized",
      objective: "idle",
      decisionTrace,
      semanticScores: {},
      stageEvaluations: [],
      predictions,
      lastLatencyMs: 0,
      lastError: "",
      safetyReason: "none"
    };
  }

  self.AIKernelDoomControlRuntimePackets = Object.freeze({
    actionFromStage,
    idleAction,
    statusFromAction,
    initializedStatus,
    turnFromYaw
  });
})();
