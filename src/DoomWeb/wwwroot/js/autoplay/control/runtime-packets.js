(function () {
  "use strict";

  const DEFAULT_CONTROLLER = "control-runtime-shim";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, number(value, 0)));
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`AIKernelDoomControlRuntimePackets requires ${name}.`);
    }

    return value;
  }

  function requirePipelineGraph(name) {
    const fn = self.AIKernelDoomControlPipelineGraph?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlPipelineGraph.${name} is not available.`);
    }

    return fn;
  }

  function requireZoeVeto(name) {
    const fn = self.AIKernelDoomControlZoeVeto?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlZoeVeto.${name} is not available.`);
    }

    return fn;
  }

  function turnFromYaw(yaw, numberFn = number) {
    const value = numberFn(yaw, 0);
    return value > 0 ? "right" : (value < 0 ? "left" : "none");
  }

  function turnYawFromAction(action, fallback = 0) {
    const explicit = number(action?.turnYaw, NaN);
    if (Number.isFinite(explicit) && explicit !== 0) {
      return explicit;
    }

    if (action?.turn === "right") {
      return 1;
    }

    if (action?.turn === "left") {
      return -1;
    }

    return number(fallback, 0);
  }

  function strategyNameFromContext(context, fallback) {
    return context?.profile?.pipeline?.name || context?.profile?.strategyName || fallback || "DynamicPipeline";
  }

  function resolveKairosPriorityAxis(action, context) {
    const values = context?.values || {};
    const logos = clamp01(Math.max(
      number(values.spawnCorridorGapScore, 0),
      number(values.bridgeDoorScore, 0),
      number(values.firstDoorUse3x3Score, 0),
      number(values.firstDoorRouteEvidence, 0)));
    const pathos = clamp01(Math.max(
      values.routeWallObstacle ? 0.62 : 0,
      values.routeFootObstacle ? 0.48 : 0,
      values.routeOpenSpaceLowGapEscape ? 0.42 : 0,
      number(values.lethalRisk, 0)));
    const ethos = clamp01(Math.max(
      action?.objective && action.objective !== "idle" ? 0.42 : 0,
      action?.use ? 0.64 : 0,
      number(values.eastWindowRecoverAnchor, 0) ? 0.28 : 0));
    const selectedAxis = pathos >= 0.58 && pathos >= logos && pathos >= ethos
      ? "pathos"
      : (ethos > logos && ethos - logos > 0.08 ? "ethos" : "logos");
    return { logos, pathos, ethos, selectedAxis };
  }

  function maxValue(...values) {
    let result = 0;
    for (let index = 0; index < values.length; index += 1) {
      result = Math.max(result, number(values[index], 0));
    }

    return result;
  }

  function routeLoopPressure(values) {
    return Boolean(values.routeLoopBudgetExceeded)
      ? 0.9
      : clamp01(maxValue(
        number(values.routePivotBudget, 0) > 0 ? number(values.routePivotUsed, 0) / number(values.routePivotBudget, 1) : 0,
        number(values.routeSlideBudget, 0) > 0 ? number(values.routeSlideUsed, 0) / number(values.routeSlideBudget, 1) : 0,
        number(values.routeBackoffBudget, 0) > 0 ? number(values.routeBackoffUsed, 0) / number(values.routeBackoffBudget, 1) : 0));
  }

  function uniqueLabels(values) {
    const seen = new Set();
    const output = [];
    for (let index = 0; index < values.length; index += 1) {
      const label = String(values[index] || "").trim();
      if (!label || label === "none" || seen.has(label)) {
        continue;
      }

      seen.add(label);
      output.push(label);
    }

    return output;
  }

  function createNoesisProjection(values, action) {
    const wallFlow = clamp01(Math.abs(number(values.wallFlowVector, values.wallVector)));
    const gap = clamp01(maxValue(Math.abs(number(values.gapVector, 0)), values.spawnCorridorGapScore));
    const corridorFlow = clamp01(maxValue(Math.abs(number(values.corridorVector, 0)), values.firstDoorRouteEvidence, values.routeConfidence));
    const goalDirection = clamp01(maxValue(values.firstDoorUse3x3Score, values.firstDoorVision9x9Score, values.firstDoorRouteEvidence, values.bridgeDoorScore));
    const loopPressure = routeLoopPressure(values);
    const stuck = clamp01(maxValue(
      loopPressure,
      values.routeFootObstacle ? 0.46 : 0,
      values.routeWallObstacle ? 0.52 : 0,
      number(values.motionForwardProgress, 0) < 0.10 ? number(values.motionObstacleScore, 0) : 0));
    const threat = clamp01(maxValue(values.lethalRisk, values.enemyConfidence, values.projectileScore, values.dynamicObjectScore));
    const stability = clamp01(1 - maxValue(values.motionObstacleScore, values.footObstacleScore) * 0.75);
    const confidence = clamp01((gap + corridorFlow + goalDirection + stability) / 4);
    const events = {
      wallFlow,
      corridorFlow,
      gap,
      stuck,
      oscillation: clamp01(number(values.turnRepeatFrames, 0) / 16),
      looming: clamp01(number(values.loomingScore, 0)),
      enemyPresence: clamp01(number(values.enemyConfidence, 0)),
      damageLocalization: clamp01(number(values.lethalRisk, 0)),
      projectileFlow: clamp01(number(values.projectileScore, 0)),
      threatField: threat,
      explorationEntropy: clamp01(values.routeMode === "spawn-approach" ? Math.max(0, 0.35 - gap) : 0),
      itemBacktrack: clamp01(number(values.itemBacktrackScore, 0)),
      goalDirection,
      safeZone: clamp01(1 - threat),
      intentConsistency: clamp01(number(values.routeConfidence, 0)),
      movementStability: stability,
      confidenceFusion: confidence
    };
    const vectors = {
      wallFlowVector: wallFlow,
      gapVector: gap,
      corridorVector: corridorFlow,
      stuckVector: stuck,
      loomingVector: events.looming,
      enemyVector: events.enemyPresence,
      damageVector: events.damageLocalization,
      projectileVector: events.projectileFlow,
      threatVector: threat,
      explorationVector: events.explorationEntropy,
      itemVector: events.itemBacktrack,
      goalVector: goalDirection,
      safeZoneVector: events.safeZone,
      intentVector: events.intentConsistency,
      stabilityVector: stability,
      confidenceVector: confidence
    };
    const eventLabels = uniqueLabels([
      action?.stage,
      action?.pipeline,
      values.routeLoopKind,
      values.routeActionHint,
      values.routeAbortHint,
      values.routeFootObstacle ? "foot-obstacle" : "",
      values.routeWallObstacle ? "wall-obstacle" : "",
      gap >= 0.30 ? "gap-visible" : "",
      goalDirection >= 0.30 ? "goal-direction" : "",
      threat >= 0.30 ? "threat-field" : ""
    ]);
    const vector4 = [
      gap,
      clamp01(number(values.spawnLandmarkRouteEvidence, 0)),
      clamp01(number(values.footObstacleScore, 0)),
      clamp01(number(values.motionObstacleScore, 0))
    ];
    return { events, eventLabels, vectors, vector4 };
  }

  function createToposProjection(values, kairos, noesis, action) {
    const logosVector = clamp01(maxValue(
      values.firstDoorRouteEvidence,
      values.routeConfidence,
      values.firstDoorUse3x3Score,
      values.firstDoorVision9x9Score,
      noesis?.vectors?.gapVector,
      noesis?.vectors?.corridorVector));
    const pathosVector = clamp01(maxValue(
      noesis?.vectors?.threatVector,
      noesis?.vectors?.stuckVector,
      Boolean(values.routeLoopBudgetExceeded) ? 0.9 : 0));
    const ethosVector = clamp01(maxValue(
      actionObjectiveScore(values),
      values.eastWindowRecoverAnchor ? 0.28 : 0,
      values.routeMode === "door-approach" ? 0.62 : 0.42));
    return {
      LogosVector: logosVector,
      PathosVector: pathosVector,
      EthosVector: ethosVector,
      DecisionVector: clamp01(maxValue(kairos?.logos, kairos?.pathos, kairos?.ethos, logosVector, pathosVector, ethosVector))
    };
  }

  function createToposLabels(values, kairos, action) {
    const selectedAxis = String(kairos?.selectedAxis || "logos").toLowerCase();
    const routeLabel = values.routeLoopBudgetExceeded
      ? "route-abort"
      : (values.firstDoorRouteEvidenceReady ? "route-structural" : (values.routeConfidence >= 0.30 ? "route-recover" : "fallback"));
    return uniqueLabels([
      routeLabel,
      selectedAxis === "pathos" ? "escape" : "",
      selectedAxis === "ethos" ? "goal-attractor" : "",
      selectedAxis === "logos" ? "structural-follow" : "",
      action?.use ? "use-probe" : "",
      values.routeAbortHint
    ]);
  }

  function actionObjectiveScore(values) {
    return values.currentRoute && values.currentRoute !== "unknown" ? 0.42 : 0;
  }

  function createPipelineState(action, context) {
    const values = context?.values || {};
    const kairos = resolveKairosPriorityAxis(action, context);
    const noesis = createNoesisProjection(values, action);
    return {
      aisthesis: {
        sensorReadings: {
          visual: clamp01(Math.max(number(values.firstDoorUse3x3Score, 0), number(values.firstDoorVision9x9Score, 0))),
          movement: clamp01(number(values.motionForwardProgress, 0)),
          collision: values.routeFootObstacle || values.routeWallObstacle ? 1 : 0,
          spatial: clamp01(number(values.spawnCorridorGapScore, 0))
        },
        routePlan: {
          routeFootObstacle: Boolean(values.routeFootObstacle),
          routeFootClearRequired: Boolean(values.routeFootClearRequired),
          routeWallObstacle: Boolean(values.routeWallObstacle),
          routeOpenSpaceLowGapEscape: Boolean(values.routeOpenSpaceLowGapEscape),
          firstDoorRouteEvidence: clamp01(number(values.firstDoorRouteEvidence, 0)),
          firstDoorRouteEvidenceReady: Boolean(values.firstDoorRouteEvidenceReady),
          eastWindowRouteEvidenceReady: Boolean(values.eastWindowRouteEvidenceReady),
          currentRoute: values.currentRoute || "open-space-cruise",
          routeMode: values.routeMode || "spawn-approach",
          routeLoopKind: values.routeLoopKind || "none",
          routeAbortHint: values.routeAbortHint || "none",
          routeLoopBudgetExceeded: Boolean(values.routeLoopBudgetExceeded),
          routePivotUsed: Math.max(0, Math.floor(number(values.routePivotUsed, 0))),
          routePivotBudget: Math.max(0, Math.floor(number(values.routePivotBudget, 0))),
          routeSlideUsed: Math.max(0, Math.floor(number(values.routeSlideUsed, 0))),
          routeSlideBudget: Math.max(0, Math.floor(number(values.routeSlideBudget, 0))),
          routeBackoffUsed: Math.max(0, Math.floor(number(values.routeBackoffUsed, 0))),
          routeBackoffBudget: Math.max(0, Math.floor(number(values.routeBackoffBudget, 0))),
          currentLandmark: values.currentLandmark || "none",
          routeActionHint: values.routeActionHint || "cruise",
          routeConfidence: clamp01(number(values.routeConfidence, 0)),
          recommendedYaw: number(values.recommendedYaw, 0),
          useProbeConfidence: clamp01(number(values.useProbeConfidence, 0))
        }
      },
      noesis: {
        phainesisEvents: noesis.events,
        eventLabels: noesis.eventLabels,
        meaningVector4: noesis.vector4,
        nousVectors: noesis.vectors
      },
      krisis: {
        kairos,
        toposVectors: createToposProjection(values, kairos, noesis, action),
        toposLabels: createToposLabels(values, kairos, action)
      },
      kinesis: {
        moveForward: action?.move === "forward",
        moveBackward: action?.move === "back",
        strafeLeft: action?.strafe && action?.turn === "left",
        strafeRight: action?.strafe && action?.turn === "right",
        turnYaw: turnYawFromAction(action),
        useKey: Boolean(action?.use),
        attackKey: Boolean(action?.fire),
        actionRepeatFrames: Math.max(0, Math.floor(number(values.actionRepeatFrames, 0))),
        moveRepeatFrames: Math.max(0, Math.floor(number(values.moveRepeatFrames, 0))),
        turnRepeatFrames: Math.max(0, Math.floor(number(values.turnRepeatFrames, 0))),
        sourceAxis: kairos.selectedAxis,
        zoe: {
          vetoed: Boolean(action?.zoeVetoed) || number(values.lethalRisk, 0) >= 0.7,
          lethalRisk: clamp01(number(values.lethalRisk, 0)),
          healthThreshold: 10,
          lastReason: Boolean(action?.zoeVetoed) ? (action?.svcEvent || "zoe-veto") : (number(values.lethalRisk, 0) >= 0.7 ? "health-lethal-risk" : "none"),
          overrideAction: Boolean(action?.zoeVetoed) || number(values.lethalRisk, 0) >= 0.7 ? "stop" : "none"
        }
      }
    };
  }

  function labelize(value) {
    const text = String(value || "none").replace(/[-_.]+/g, " ").trim();
    if (!text) {
      return "Monitor";
    }

    return text.replace(/\b([a-z])/g, match => match.toUpperCase());
  }

  function resolveTelos(objective, pipeline) {
    const text = `${objective || ""} ${pipeline || ""}`.toLowerCase();
    if (text.includes("retry") || text.includes("death")) {
      return "Recovery";
    }

    if (text.includes("computer") || text.includes("central-hall")) {
      return "ComputerRoom";
    }

    if (text.includes("first-door") || text.includes("open-door") || text.includes("corridor") || text.includes("openinghome") || text.includes("demo-spawn")) {
      return "FirstDoor";
    }

    return "Monitor";
  }

  function axisPrefix(axis) {
    const normalized = String(axis || "logos").toLowerCase();
    return normalized === "pathos" ? "P" : (normalized === "ethos" ? "E" : "L");
  }

  function createGoalState(action, context, pipelineState) {
    const objective = action?.objective || "idle";
    const pipeline = action?.pipeline || action?.stage || "none";
    const kairos = pipelineState?.krisis?.kairos || resolveKairosPriorityAxis(action, context);
    const selectedAxis = String(kairos.selectedAxis || "logos").toLowerCase();
    const prefix = axisPrefix(selectedAxis);
    const objectiveLabel = labelize(objective === "idle" ? pipeline : objective);
    let priority = `[${prefix}] ${selectedAxis === "pathos" ? "Avoid Threat" : (selectedAxis === "ethos" ? "Pursue Goal" : "Approach Target")}`;
    if (action?.use) {
      priority = `[${prefix}] Use / Open`;
    } else if (action?.fire) {
      priority = `[${prefix}] Fire`;
    }

    const score = selectedAxis === "pathos"
      ? kairos.pathos
      : (selectedAxis === "ethos" ? kairos.ethos : kairos.logos);
    const kairosSignal = `Kairos: ${labelize(selectedAxis)} ${clamp01(score).toFixed(2)}`;
    return {
      enabled: true,
      telos: resolveTelos(objective, pipeline),
      objective: objectiveLabel,
      priority,
      priorityAxis: labelize(selectedAxis),
      kairosSignal,
      subObjectives: [
        { kind: "objective", label: objectiveLabel },
        { kind: "kairos", label: kairosSignal }
      ]
    };
  }

  function createDebugOverlay(action, context, pipelineState, goalState) {
    const values = context?.values || {};
    const kairos = pipelineState?.krisis?.kairos || {};
    const selectedAxis = String(kairos.selectedAxis || "logos").toLowerCase();
    const grid = [];
    const visual = clamp01(Math.max(number(values.firstDoorUse3x3Score, 0), number(values.firstDoorVision9x9Score, 0)));
    const movement = clamp01(number(values.motionForwardProgress, 0));
    const collision = values.routeFootObstacle || values.routeWallObstacle ? 1 : 0;
    const spatial = clamp01(number(values.spawnCorridorGapScore, 0));
    for (let index = 0; index < 9; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const score = clamp01(index === 4 ? Math.max(visual, spatial) : (column === 1 ? visual : Math.max(movement, collision)));
      grid.push({
        row,
        column,
        score,
        kind: index === 4 ? "vision" : (collision > 0.4 ? "motion" : "scan"),
        active: score > 0.08
      });
    }

    const regions = [
      {
        kind: "objective",
        label: "PRIORITY:",
        value: goalState.priority,
        left: 33,
        top: 49,
        width: 34,
        height: 16,
        priority: selectedAxis === "pathos" ? "high" : "mid",
        active: true
      }
    ];
    if (values.firstDoorRouteEvidenceReady) {
      regions.push({
        kind: "door",
        label: "route",
        value: `${values.currentRoute || "first-door"} ${clamp01(values.firstDoorRouteEvidence).toFixed(2)}/${clamp01(values.routeConfidence).toFixed(2)}`,
        left: 30,
        top: 18,
        width: 40,
        height: 42,
        priority: "high",
        active: true
      });
    }
    if (values.routeWallObstacle) {
      regions.push({
        kind: "wall",
        label: "wall avoid",
        value: values.routeFootClearRequired ? "clear foot" : "wall contact",
        left: number(values.wallAwayYaw, 0) < 0 ? 58 : 4,
        top: 22,
        width: 38,
        height: 42,
        priority: "high",
        active: true
      });
    }

    const yaw = turnYawFromAction(action, number(values.recommendedYaw, 0) || number(values.routeFallbackYaw, 0));
    return {
      grid,
      regions,
      useProbe: {
        active: Boolean(action?.use) || yaw !== 0,
        direction: yaw > 0 ? "right" : (yaw < 0 ? "left" : "none"),
        frames: action?.use ? 1 : 0,
        confidence: clamp01(number(values.useProbeConfidence, 0))
      },
      kairosBlink: true,
      kairosLabel: goalState.kairosSignal
    };
  }

  function createAutoplayState(action, context, pipelineState, goalState, debugOverlay) {
    const values = context?.values || {};
    const currentRoute = values.currentRoute || (values.routeOpenSpaceLowGapEscape
      ? "open-space-low-gap-escape"
      : (values.firstDoorRouteEvidenceReady ? "first-door-route" : (values.routeWallObstacle ? "wall-follow-fallback" : (action?.pipeline || "idle"))));
    const currentLandmark = values.currentLandmark || (values.firstDoorRouteEvidenceReady
      ? "first-door-route-evidence"
      : (values.spawnLandmarkRouteYaw ? "landmark-route" : (values.spawnCorridorGapTurn !== "none" ? "spawn-corridor-gap" : "none")));
    const fallbackYaw = number(values.recommendedYaw, 0) || number(values.routeFallbackYaw, 0);
    const actionYaw = turnYawFromAction(action, fallbackYaw);
    return {
      currentRoute,
      routeMode: values.routeMode || "spawn-approach",
      routeLoopKind: values.routeLoopKind || "none",
      routeAbortHint: values.routeAbortHint || "none",
      routeLoopBudgetExceeded: Boolean(values.routeLoopBudgetExceeded),
      currentLandmark,
      routeConfidence: clamp01(number(values.routeConfidence, 0)),
      recommendedYaw: fallbackYaw,
      footObstacleState: values.routeFootClearRequired ? "clear-required" : (values.routeFootObstacle ? "blocked" : "clear"),
      motionObstacleState: values.routeWallObstacle ? "wall-contact" : (values.routeCloseObstacle ? "close-obstacle" : "clear"),
      suggestedAction: {
        move: action?.move || "none",
        turn: action?.turn && action.turn !== "none" ? action.turn : (actionYaw > 0 ? "right" : (actionYaw < 0 ? "left" : "none")),
        strafe: Boolean(action?.strafe),
        use: Boolean(action?.use),
        fire: Boolean(action?.fire),
        yaw: actionYaw
      },
      routePlan: pipelineState?.aisthesis?.routePlan || {},
      navigator: {
        routeFallbackYaw: number(values.routeFallbackYaw, 0),
        spawnCorridorGapYaw: number(values.spawnCorridorGapTurn === "right" ? 1 : (values.spawnCorridorGapTurn === "left" ? -1 : 0), 0),
        landmarkRouteYaw: number(values.spawnLandmarkRouteYaw, 0),
        wallAwayYaw: number(values.wallAwayYaw, 0),
        recommendedYaw: fallbackYaw
      },
      pipelineState,
      goalState,
      debugOverlay
    };
  }

  function compileCanonicalGraph(profile = {}) {
    return requirePipelineGraph("compileCanonicalGraph")(profile);
  }

  function applyZoeVeto(action, state, profile, helpers = {}) {
    return requireZoeVeto("applyZoeVeto")(action, state, profile, helpers);
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
      turnYaw: numberFn(turnYaw, 0),
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
      zoeVetoed: false,
      svcEvent: "none",
      semanticScores: semanticScores(context?.state, context?.profile)
    };
  }

  function idleAction(state, profile, helpers = {}) {
    const semanticScores = helpers.semanticScores || (() => ({}));
    return {
      move: "none",
      turn: "none",
      turnYaw: 0,
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
      zoeVetoed: false,
      svcEvent: "none",
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
    const kairosPriorityAxis = resolveKairosPriorityAxis(action, context);
    const pipelineState = createPipelineState(action, context);
    const goalState = createGoalState(action, context, pipelineState);
    const debugOverlay = createDebugOverlay(action, context, pipelineState, goalState);
    const autoplayState = createAutoplayState(action, context, pipelineState, goalState, debugOverlay);

    return {
      strategyName,
      controller,
      runtimeId,
      controlPipeline: action?.pipeline || "none",
      stage: action?.stage || "none",
      objective: action?.objective || "idle",
      strategyPriority: number(action?.strategyPriority, 0),
      evidenceScore: number(action?.evidenceScore, 0),
      zoeVetoed: Boolean(action?.zoeVetoed),
      svcEvent: action?.svcEvent || "none",
      graph: helpers.graph || compileCanonicalGraph(context?.profile),
      decisionTrace,
      semanticScores: action?.semanticScores || {},
      stageEvaluations,
      kairosPriorityAxis,
      pipelineState,
      goalState,
      debugOverlay,
      autoplayState,
      recommendedYaw: number(context?.values?.recommendedYaw, 0),
      routeConfidence: number(context?.values?.routeConfidence, 0),
      routeFallbackYaw: number(context?.values?.routeFallbackYaw, 0),
      openCruiseYaw: number(context?.values?.openCruiseYaw, 0),
      spawnCorridorGapScore: number(context?.values?.spawnCorridorGapScore, 0),
      spawnCorridorGapTurn: context?.values?.spawnCorridorGapTurn || "none",
      debugRouteValues: {
        predictions: number(context?.values?.predictions, 0),
        context: context?.values?.context || "unknown",
        depthSig: number(context?.values?.depthSig, 0),
        footObstacleScore: number(context?.values?.footObstacleScore, 0),
        footObstacleFlickerScore: number(context?.values?.footObstacleFlickerScore, 0),
        footObstacleBounceFrames: number(context?.values?.footObstacleBounceFrames, 0),
        routeTextureWallOcclusion: Boolean(context?.values?.routeTextureWallOcclusion),
        motionObstacleScore: number(context?.values?.motionObstacleScore, 0),
        routeFootObstacle: Boolean(context?.values?.routeFootObstacle),
        routeDepthClose: Boolean(context?.values?.routeDepthClose),
        routeCloseObstacle: Boolean(context?.values?.routeCloseObstacle),
        routeWallObstacle: Boolean(context?.values?.routeWallObstacle),
        routeMode: context?.values?.routeMode || "spawn-approach",
        routeLoopKind: context?.values?.routeLoopKind || "none",
        routeAbortHint: context?.values?.routeAbortHint || "none",
        routeLoopBudgetExceeded: Boolean(context?.values?.routeLoopBudgetExceeded),
        routePivotUsed: number(context?.values?.routePivotUsed, 0),
        routePivotBudget: number(context?.values?.routePivotBudget, 0),
        routeSlideUsed: number(context?.values?.routeSlideUsed, 0),
        routeSlideBudget: number(context?.values?.routeSlideBudget, 0),
        routeBackoffUsed: number(context?.values?.routeBackoffUsed, 0),
        routeBackoffBudget: number(context?.values?.routeBackoffBudget, 0),
        currentRoute: context?.values?.currentRoute || "unknown",
        currentLandmark: context?.values?.currentLandmark || "none",
        routeActionHint: context?.values?.routeActionHint || "none",
        routeConfidence: number(context?.values?.routeConfidence, 0),
        recommendedYaw: number(context?.values?.recommendedYaw, 0),
        useProbeConfidence: number(context?.values?.useProbeConfidence, 0),
        spawnCorridorGapScore: number(context?.values?.spawnCorridorGapScore, 0),
        spawnLandmarkRouteEvidence: number(context?.values?.spawnLandmarkRouteEvidence, 0),
        spawnSecretDoorScore: number(context?.values?.spawnSecretDoorScore, 0),
        eastWindowRecoverAnchor: Boolean(context?.values?.eastWindowRecoverAnchor),
        firstDoorUse3x3Score: number(context?.values?.firstDoorUse3x3Score, 0),
        firstDoorVision9x9Score: number(context?.values?.firstDoorVision9x9Score, 0),
        courtyardScore: number(context?.values?.courtyardScore, 0),
        bridgeDoorScore: number(context?.values?.bridgeDoorScore, 0)
      },
      predictions: predictions || 0,
      lastLatencyMs: 0,
      lastError: "",
      safetyReason: action?.safetyReason || "none"
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
      graph: options.graph || null,
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
    applyZoeVeto,
    actionFromStage,
    compileCanonicalGraph,
    idleAction,
    statusFromAction,
    initializedStatus,
    turnFromYaw
  });

})();
