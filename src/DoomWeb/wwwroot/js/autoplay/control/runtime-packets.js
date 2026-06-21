(function () {
  "use strict";

  const DEFAULT_CONTROLLER = "control-runtime-shim";
  const GPU_CONTRACTS = requireGpuContracts();
  const RAW_FRAMEBUFFER_TARGET = GPU_CONTRACTS.rawFramebufferTarget;
  const RAW_FRAMEBUFFER_WIRE_NAME = GPU_CONTRACTS.rawFramebufferWireName;
  const HUD_COMPOSITE_TARGET = GPU_CONTRACTS.hudCompositeTarget;
  const HUD_COMPOSITE_WIRE_NAME = GPU_CONTRACTS.hudCompositeWireName;
  const GPU_AISTHESIS_FEATURE_TARGET = GPU_CONTRACTS.aisthesisFeatureTarget;
  const GPU_AISTHESIS_MATRIX_TARGET = GPU_CONTRACTS.aisthesisMatrixTarget;
  const GPU_AISTHESIS_MASK_TARGET = GPU_CONTRACTS.aisthesisMaskTarget;
  const GPU_AISTHESIS_MASK_LAYOUT = GPU_CONTRACTS.aisthesisMaskLayout;
  const GPU_SPATIAL_OUTPUT_TARGET = GPU_CONTRACTS.spatialOutputTarget;
  const GPU_SPATIAL_OUTPUT_FIELDS = GPU_CONTRACTS.spatialOutputFields;
  const HUD_GRID_SIZE = GPU_CONTRACTS.hudGridSize;
  const HUD_CELL_COUNT = GPU_CONTRACTS.hudCellCount;
  const HUD_RECT_COUNT = GPU_CONTRACTS.hudRectCount;
  const HUD_LABEL_COUNT = GPU_CONTRACTS.hudLabelCount;
  const HUD_RECT_STRIDE = GPU_CONTRACTS.hudRectStride;
  const HUD_RECT_FIELDS = GPU_CONTRACTS.hudRectFields;
  const HUD_PANEL_VALUE_COUNT = GPU_CONTRACTS.hudPanelValueCount;
  const HUD_PANEL_FIELDS = GPU_CONTRACTS.hudPanelFields;
  const HUD_PANEL_LAYOUT_NAME = GPU_CONTRACTS.hudPanelLayoutName;
  const GPU_AISTHESIS_MATRIX_FLOAT_COUNT = GPU_CONTRACTS.aisthesisMatrixFloatCount;
  const GPU_STATE_VECTOR_FLOAT_COUNT = GPU_CONTRACTS.stateVectorFloatCount;
  const GPU_STATE_VECTOR_FIELDS = GPU_CONTRACTS.stateVectorFields;
  const GPU_STATE_VECTOR_LAYOUT_NAME = GPU_CONTRACTS.stateVectorLayoutName;
  const GPU_SPATIAL_OUTPUT_FLOAT_COUNT = GPU_CONTRACTS.spatialOutputFloatCount;
  const GPU_SPATIAL_OUTPUT_LAYOUT_NAME = GPU_CONTRACTS.spatialOutputLayoutName;

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

  function requireGpuContracts() {
    const contracts = self.AIKernelDoomGpuContracts;
    if (!contracts || typeof contracts.aisthesisMaskTextureTarget !== "function") {
      throw new Error("AIKernelDoomGpuContracts is not available.");
    }

    return contracts;
  }

  function objectPacket(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function firstObjectPacket(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const packet = objectPacket(values[index]);
      if (packet) {
        return packet;
      }
    }

    return null;
  }

  function resolveCanonicalPipelineState(action, context) {
    const values = context?.values || {};
    return firstObjectPacket(
      action?.pipelineState,
      action?.PipelineState,
      action?.autoplayState?.pipelineState,
      action?.AutoplayState?.PipelineState,
      context?.pipelineState,
      context?.PipelineState,
      context?.state?.pipelineState,
      context?.state?.PipelineState,
      values.pipelineState,
      values.PipelineState);
  }

  function resolveCanonicalGoalState(action, context, autoplayState) {
    const values = context?.values || {};
    return firstObjectPacket(
      action?.goalState,
      action?.GoalState,
      action?.autoplayState?.goalState,
      action?.AutoplayState?.GoalState,
      autoplayState?.goalState,
      autoplayState?.GoalState,
      context?.goalState,
      context?.GoalState,
      context?.state?.goalState,
      context?.state?.GoalState,
      values.goalState,
      values.GoalState);
  }

  function resolveCanonicalDebugOverlay(action, context, autoplayState) {
    const values = context?.values || {};
    return firstObjectPacket(
      action?.debugOverlay,
      action?.DebugOverlay,
      action?.autoplayState?.debugOverlay,
      action?.AutoplayState?.DebugOverlay,
      autoplayState?.debugOverlay,
      autoplayState?.DebugOverlay,
      context?.debugOverlay,
      context?.DebugOverlay,
      context?.state?.debugOverlay,
      context?.state?.DebugOverlay,
      values.debugOverlay,
      values.DebugOverlay);
  }

  function resolveCanonicalAutoplayState(action, context) {
    const values = context?.values || {};
    return firstObjectPacket(
      action?.autoplayState,
      action?.AutoplayState,
      context?.autoplayState,
      context?.AutoplayState,
      context?.state?.autoplayState,
      context?.state?.AutoplayState,
      values.autoplayState,
      values.AutoplayState);
  }

  function completeCanonicalAutoplayState(autoplayState, pipelineState, goalState, debugOverlay) {
    if (!autoplayState) {
      return null;
    }

    return Object.assign({}, autoplayState, {
      pipelineState: autoplayState.pipelineState || autoplayState.PipelineState || pipelineState,
      goalState: autoplayState.goalState || autoplayState.GoalState || goalState,
      debugOverlay: autoplayState.debugOverlay || autoplayState.DebugOverlay || debugOverlay
    });
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

  function directionFromYawOrAudio(yaw, audioDirection) {
    const value = number(yaw, 0);
    if (value < -4) {
      return "left";
    }

    if (value > 4) {
      return "right";
    }

    return audioDirection === "left" || audioDirection === "right" ? audioDirection : "front";
  }

  function enemyCircleLeft(yaw, audioDirection) {
    const direction = directionFromYawOrAudio(yaw, audioDirection);
    if (direction === "left") {
      return 21;
    }

    if (direction === "right") {
      return 63;
    }

    return 42;
  }

  function enemyCirclePacket(values, action, combatScore) {
    const visualSuppressed = Boolean(values.visualEnemySuppressed);
    const visualScore = visualSuppressed
      ? 0
      : clamp01(number(values.visualEnemyConfidence, values.enemyConfidence));
    const audioScore = clamp01(number(values.audioEnemyConfidence, 0));
    const visualActive = Boolean(values.visualEnemyFireReady)
      || visualScore >= 0.35
      || (Boolean(values.visualEnemyVisible) && visualScore >= 0.35);
    const audioActive = audioScore >= 0.24;
    const enemyYaw = number(values.enemyCombatYaw, number(values.visualEnemyYaw, 0));
    const audioDirection = values.audioEnemyDirection || "none";
    const type = visualActive && audioActive
      ? "av"
      : (visualActive ? "visual" : (audioActive ? "audio" : "threat"));
    const confidence = clamp01(Math.max(visualScore, audioScore, combatScore, action?.fire ? 1 : 0));
    const direction = directionFromYawOrAudio(enemyYaw, audioDirection);
    const yawClamped = Math.max(-32, Math.min(32, enemyYaw));
    const visualLeft = 43 + (yawClamped / 32) * 22;
    const left = type === "visual" || type === "av"
      ? Math.max(10, Math.min(78, visualLeft))
      : enemyCircleLeft(enemyYaw, audioDirection);
    const top = type === "audio" ? 34 : 31;
    const width = type === "visual" ? 12 : (type === "audio" ? 21 : 17);
    const height = type === "visual" ? 14 : (type === "audio" ? 23 : 19);
    const active = confidence >= 0.24 && (visualActive || audioActive || Boolean(action?.fire));
    return {
      type,
      source: visualSuppressed && audioActive ? "audio-terminal-mask" : type,
      yaw: Math.round(enemyYaw),
      direction,
      confidence,
      visualConfidence: visualScore,
      audioConfidence: audioScore,
      left,
      top,
      width,
      height,
      active
    };
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
    const threat = clamp01(maxValue(
      values.lethalRisk,
      values.enemyConfidence,
      values.audioEnemyConfidence,
      values.visualEnemyVisible ? 0.32 : 0,
      values.projectileScore,
      values.dynamicObjectScore));
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
      number(values.audioEnemyConfidence, 0) >= 0.24 ? `audio-enemy-${values.audioEnemyDirection || "front"}` : "",
      values.visualEnemyVisible ? "visual-combat" : "",
      values.routeCorridorBridgeLock ? "corridor-bridge-lock" : "",
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
    const topology = createTopologyProjection(values, gap, vector4[1], vector4[2], vector4[3]);
    return { events, eventLabels, vectors, vector4, topology };
  }

  function createTopologyProjection(values, gap, landmark, foot, motion) {
    const explicitBarrel = number(values.routeTopologyBarrelZoneEvidence, NaN);
    const explicitAlignment = number(values.routeTopologyCenterCorridorAlignment, NaN);
    const explicitWall = number(values.routeTopologyWallDistanceNormalized, NaN);
    if (Number.isFinite(explicitBarrel) && Number.isFinite(explicitAlignment) && Number.isFinite(explicitWall)) {
      const yaw = number(values.recommendedYaw, 0) || number(values.routeFallbackYaw, 0);
      const yawSign = yaw > 0 ? 1 : (yaw < 0 ? -1 : 0);
      const corridorStrength = clamp01(maxValue(gap, landmark, values.firstDoorRouteEvidence, values.routeConfidence));
      const centerlineDirectionX = yawSign === 0 ? 0 : Math.max(-1, Math.min(1, -yawSign * Math.max(clamp01(explicitBarrel), 1 - clamp01(explicitWall)) * 0.8));
      const centerlineDirectionY = clamp01(1 - explicitBarrel);
      const corridorDirectionHintX = yawSign === 0 ? 0 : Math.max(-1, Math.min(1, yawSign * corridorStrength));
      return {
        wallDistanceNormalized: clamp01(explicitWall),
        centerlineDirectionX,
        centerlineDirectionY,
        barrelZoneEvidence: clamp01(explicitBarrel),
        corridorDirectionHintX,
        corridorDirectionHintY: corridorStrength,
        centerCorridorAlignment: Math.max(-1, Math.min(1, explicitAlignment)),
        deadEndRisk: Boolean(values.routeDeadEndRisk)
      };
    }

    const routeWall = Boolean(values.routeWallObstacle) ? 0.82 : 0;
    const routeFoot = Boolean(values.routeFootObstacle) ? 0.62 : 0;
    const barrelRisk = Boolean(values.routeBarrelLaneRisk) ? 0.78 : 0;
    const barrelDetour = Boolean(values.routeBarrelLaneDetourRequired) ? 0.86 : 0;
    const wallPressure = clamp01(maxValue(foot, motion, routeWall, routeFoot, barrelRisk, barrelDetour));
    const ambiguousLandmark = landmark >= 0.34 && landmark <= 0.48 && gap < 0.30;
    const barrelZoneEvidence = clamp01(
      (Boolean(values.routeBarrelLaneRisk) ? 0.52 : 0)
      + (Boolean(values.routeBarrelLaneDetourRequired) ? 0.62 : 0)
      + foot * 0.34
      + motion * 0.22
      + (1 - gap) * 0.16
      + (ambiguousLandmark ? 0.18 : 0));
    const yaw = number(values.recommendedYaw, 0) || number(values.routeFallbackYaw, 0);
    const yawSign = yaw > 0 ? 1 : (yaw < 0 ? -1 : 0);
    const corridorStrength = clamp01(maxValue(gap, landmark, values.firstDoorRouteEvidence, values.routeConfidence));
    const centerlineDirectionX = yawSign === 0 ? 0 : Math.max(-1, Math.min(1, -yawSign * Math.max(barrelZoneEvidence, wallPressure) * 0.8));
    const centerlineDirectionY = clamp01(1 - barrelZoneEvidence);
    const corridorDirectionHintX = yawSign === 0 ? 0 : Math.max(-1, Math.min(1, yawSign * corridorStrength));
    const corridorDirectionHintY = corridorStrength;
    return {
      wallDistanceNormalized: clamp01(1 - wallPressure * 0.78),
      centerlineDirectionX,
      centerlineDirectionY,
      barrelZoneEvidence,
      corridorDirectionHintX,
      corridorDirectionHintY,
      centerCorridorAlignment: Math.max(-1, Math.min(1, centerlineDirectionX * corridorDirectionHintX + centerlineDirectionY * corridorDirectionHintY)),
      deadEndRisk: Boolean(values.routeDeadEndRisk)
    };
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
      : (values.routeCorridorBridgeLock ? "route-corridor-bridge" : (values.firstDoorRouteEvidenceReady ? "route-structural" : (values.routeConfidence >= 0.30 ? "route-recover" : "fallback")));
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
          routeBarrelLaneRisk: Boolean(values.routeBarrelLaneRisk),
          routeBarrelLaneDetourRequired: Boolean(values.routeBarrelLaneDetourRequired),
          routeDeadEndRisk: Boolean(values.routeDeadEndRisk),
          routeDeadEndTrimRequired: Boolean(values.routeDeadEndTrimRequired),
          routeCorridorBridgeEvidence: clamp01(number(values.routeCorridorBridgeEvidence, 0)),
          routeCorridorBridgeLock: Boolean(values.routeCorridorBridgeLock),
          routeCorridorBridgeLockFrames: Math.max(0, Math.floor(number(values.routeCorridorBridgeLockFrames, 0))),
          routePostDoorBridgeDoorMemory: Boolean(values.routePostDoorBridgeDoorMemory),
          routePostDoorBridgeDoorMemoryFrames: Math.max(0, Math.floor(number(values.routePostDoorBridgeDoorMemoryFrames, 0))),
          routeTopologyWallDistanceNormalized: clamp01(number(values.routeTopologyWallDistanceNormalized, 1)),
          routeTopologyBarrelZoneEvidence: clamp01(number(values.routeTopologyBarrelZoneEvidence, 0)),
          routeTopologyCenterCorridorAlignment: number(values.routeTopologyCenterCorridorAlignment, 0),
          firstDoorRouteEvidence: clamp01(number(values.firstDoorRouteEvidence, 0)),
          firstDoorRouteEvidenceReady: Boolean(values.firstDoorRouteEvidenceReady),
          eastWindowRouteEvidenceReady: Boolean(values.eastWindowRouteEvidenceReady),
          currentRoute: values.currentRoute || "open-space-cruise",
          routeMode: values.routeMode || "spawn-approach",
          routeLoopKind: values.routeLoopKind || "none",
          routeAbortHint: values.routeAbortHint || "none",
          routeLoopBudgetSource: values.routeLoopBudgetSource || "unknown",
          routeLoopBudgetExceeded: Boolean(values.routeLoopBudgetExceeded),
          routePivotUsed: Math.max(0, Math.floor(number(values.routePivotUsed, 0))),
          routePivotBudget: Math.max(0, Math.floor(number(values.routePivotBudget, 0))),
          routeSlideUsed: Math.max(0, Math.floor(number(values.routeSlideUsed, 0))),
          routeSlideBudget: Math.max(0, Math.floor(number(values.routeSlideBudget, 0))),
          routeBackoffUsed: Math.max(0, Math.floor(number(values.routeBackoffUsed, 0))),
          routeBackoffBudget: Math.max(0, Math.floor(number(values.routeBackoffBudget, 0))),
          routeAdvanceUsed: Math.max(0, Math.floor(number(values.routeAdvanceUsed, 0))),
          routeAdvanceBudget: Math.max(0, Math.floor(number(values.routeAdvanceBudget, 0))),
          routeIngressUsed: Math.max(0, Math.floor(number(values.routeIngressUsed, 0))),
          routeIngressBudget: Math.max(0, Math.floor(number(values.routeIngressBudget, 0))),
          routeRecoverUsed: Math.max(0, Math.floor(number(values.routeRecoverUsed, 0))),
          routeRecoverBudget: Math.max(0, Math.floor(number(values.routeRecoverBudget, 0))),
          routeTopologyUsed: Math.max(0, Math.floor(number(values.routeTopologyUsed, 0))),
          routeTopologyBudget: Math.max(0, Math.floor(number(values.routeTopologyBudget, 0))),
          routeArcUsed: Math.max(0, Math.floor(number(values.routeArcUsed, 0))),
          routeArcBudget: Math.max(0, Math.floor(number(values.routeArcBudget, 0))),
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
        topology: noesis.topology,
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
        usePulseCooldownFrames: Math.max(0, Math.floor(number(values.usePulseCooldown, 0))),
        usePulseSuppressedFrames: Math.max(0, Math.floor(number(values.usePulseSuppressedFrames, 0))),
        lastUsePulsePrediction: Math.max(-1, Math.floor(number(values.lastUsePulsePrediction, -1))),
        usePulseAgeFrames: Math.max(0, Math.floor(number(values.usePulseAgeFrames, 9999))),
        sourceAxis: kairos.selectedAxis,
        zoe: createZoeProjection(action, values)
      }
    };
  }

  function createZoeProjection(action, values) {
    const health = Math.max(0, Math.min(100, number(values.health, number(values.hp, 100))));
    const lowHealthThreshold = Math.max(1, Math.min(100, number(values.lowHealthThreshold, 50)));
    const criticalHealthThreshold = Math.max(1, Math.min(lowHealthThreshold, number(values.criticalHealthThreshold, 18)));
    const lethalRisk = clamp01(number(
      values.lethalRisk,
      health <= 0 ? 1 : Math.max(0, Math.min(1, (lowHealthThreshold - health) / lowHealthThreshold))));
    const lowHealth = Boolean(values.lowHealth) || (health > 0 && health < lowHealthThreshold);
    const criticalHealth = Boolean(values.criticalHealth) || (health > 0 && health < criticalHealthThreshold);
    const vetoed = Boolean(action?.zoeVetoed);
    const warning = vetoed || lowHealth || criticalHealth || lethalRisk >= 0.50;
    const lastReason = vetoed
      ? (action?.svcEvent || "zoe-veto")
      : (criticalHealth
        ? "critical-health"
        : (lowHealth ? "low-health-goal-first" : "none"));
    return {
      vetoed,
      warning,
      lowHealth,
      criticalHealth,
      health,
      lethalRisk,
      healthThreshold: lowHealthThreshold,
      criticalHealthThreshold,
      lastReason,
      overrideAction: vetoed ? "stop" : "none"
    };
  }

  function normalizeVision9x9Projection(values) {
    if (Array.isArray(values?.firstDoorVision9x9Heatmap) && values.firstDoorVision9x9Heatmap.length > 0) {
      return values.firstDoorVision9x9Heatmap.slice(0, HUD_CELL_COUNT);
    }

    const signature = String(values?.vision9x9Signature || "").trim();
    return signature.length > 0 ? signature.padEnd(HUD_CELL_COUNT, "0").slice(0, HUD_CELL_COUNT) : [];
  }

  function normalizeVisionCandidateBox(box) {
    if (!box || typeof box !== "object") {
      return null;
    }

    const maxIndex = Math.max(0, HUD_GRID_SIZE - 1);
    const centerIndex = Math.floor(maxIndex / 2);
    const row = Math.max(0, Math.min(maxIndex, Math.floor(number(box.row ?? box.Row, centerIndex))));
    const column = Math.max(0, Math.min(maxIndex, Math.floor(number(box.column ?? box.Column, centerIndex))));
    const rows = Math.max(1, Math.min(HUD_GRID_SIZE - row, Math.floor(number(box.rows ?? box.Rows, 2))));
    const columns = Math.max(1, Math.min(HUD_GRID_SIZE - column, Math.floor(number(box.columns ?? box.Columns, 2))));
    return {
      row,
      column,
      rows,
      columns,
      label: box.label || box.Label || "door",
      score: clamp01(number(box.score ?? box.Score, 0)),
      redScore: clamp01(number(box.redScore ?? box.RedScore, 0)),
      edgeScore: clamp01(number(box.edgeScore ?? box.EdgeScore, 0)),
      kind: String(box.kind || box.Kind || "door").toLowerCase()
    };
  }

  function createVisionCandidates(values) {
    const candidate = normalizeVisionCandidateBox(values?.firstDoorVision9x9Box);
    if (!candidate) {
      return { doorCandidates: [], cornerCandidates: [] };
    }

    const wallLike = candidate.kind === "first-door-wall-pattern"
      || candidate.kind === "first-door-floor-red"
      || candidate.kind.includes("corner")
      || candidate.kind.includes("wall");
    const packet = {
      row: candidate.row,
      column: candidate.column,
      rows: candidate.rows,
      columns: candidate.columns,
      label: wallLike ? "corner" : "door",
      score: candidate.score,
      redScore: candidate.redScore,
      edgeScore: candidate.edgeScore
    };
    return wallLike
      ? { doorCandidates: [], cornerCandidates: [packet] }
      : { doorCandidates: [packet], cornerCandidates: [] };
  }

  function gpuRectColor(kind, type) {
    const normalizedKind = String(kind || "diagnostic").toLowerCase();
    const normalizedType = String(type || "").toLowerCase();
    if (normalizedKind.includes("objective-pathos")) {
      return [1.00, 0.18, 0.10];
    }

    if (normalizedKind.includes("objective-ethos")) {
      return [0.20, 0.95, 0.36];
    }

    if (normalizedKind.includes("objective-use")) {
      return [1.00, 0.76, 0.18];
    }

    if (normalizedKind.includes("objective-logos") || normalizedKind.includes("objective")) {
      return [0.20, 0.82, 1.00];
    }

    if (normalizedKind === "enemy-circle" && normalizedType === "audio") {
      return [1.00, 0.62, 0.12];
    }

    if (normalizedKind === "enemy-circle" && normalizedType === "av") {
      return [1.00, 0.34, 0.08];
    }

    if (normalizedKind.includes("enemy") || normalizedKind.includes("combat") || normalizedKind.includes("zoe")) {
      return [1.00, 0.14, 0.10];
    }

    if (normalizedKind.includes("door")) {
      return [1.00, 0.76, 0.16];
    }

    if (normalizedKind.includes("bridge")) {
      return [0.18, 0.95, 0.68];
    }

    if (normalizedKind.includes("corner") || normalizedKind.includes("wall")) {
      return [1.00, 0.40, 0.10];
    }

    return [0.20, 0.82, 1.00];
  }

  function gpuRectFromCandidate(kind, candidate, alpha) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const left = number(candidate.left ?? candidate.Left, NaN);
    const top = number(candidate.top ?? candidate.Top, NaN);
    const width = number(candidate.width ?? candidate.Width, NaN);
    const height = number(candidate.height ?? candidate.Height, NaN);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return {
      kind,
      left,
      top,
      width,
      height,
      score: clamp01(maxValue(candidate.score, candidate.Score, candidate.redScore, candidate.RedScore, candidate.edgeScore, candidate.EdgeScore)),
      alpha: clamp01(alpha),
      color: gpuRectColor(kind)
    };
  }

  function isGpuPriorityRegion(region) {
    const kind = String(region?.kind || region?.Kind || "").toLowerCase();
    const priority = String(region?.priority || region?.Priority || "mid").toLowerCase();
    return priority === "high"
      || kind === "combat"
      || kind === "zoe"
      || kind === "enemy"
      || kind === "enemy-circle"
      || kind.includes("objective")
      || kind === "door"
      || kind === "bridge";
  }

  function gpuRectFromRegion(region) {
    if (!region || typeof region !== "object" || !isGpuPriorityRegion(region)) {
      return null;
    }

    const left = number(region.left ?? region.Left, NaN);
    const top = number(region.top ?? region.Top, NaN);
    const width = number(region.width ?? region.Width, NaN);
    const height = number(region.height ?? region.Height, NaN);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    const kind = String(region.kind || region.Kind || "diagnostic").toLowerCase();
    return {
      kind,
      left,
      top,
      width,
      height,
      score: region.active ?? region.Active ? 1 : 0.45,
      alpha: kind === "zoe" || kind === "combat" ? 0.78 : 0.68,
      color: gpuRectColor(kind)
    };
  }

  function gpuRectFromEnemyCircle(circle) {
    if (!circle || !circle.active) {
      return null;
    }

    return {
      kind: "enemy-circle",
      left: number(circle.left, 0),
      top: number(circle.top, 0),
      width: number(circle.width, 0),
      height: number(circle.height, 0),
      score: clamp01(circle.confidence),
      alpha: circle.type === "audio" ? 0.58 : 0.76,
      color: gpuRectColor("enemy-circle", circle.type)
    };
  }

  function appendGpuRect(rects, rect) {
    if (!rect || rects.length >= HUD_RECT_COUNT || number(rect.width, 0) <= 0 || number(rect.height, 0) <= 0) {
      return;
    }

    rects.push(rect);
  }

  function gpuLabel(className, label, value, priority, slot, source = "gpu-hud-dto", active = true, extra = null) {
    return {
      className,
      label,
      value: value || "",
      priority: priority || "mid",
      active: Boolean(active),
      slot: Math.max(0, number(slot, 0)),
      source,
      ...(extra && typeof extra === "object" ? extra : {})
    };
  }

  function appendGpuLabel(labels, label) {
    if (!label || labels.length >= HUD_LABEL_COUNT || !label.label) {
      return;
    }

    labels.push(label);
  }

  function normalizeGpuRectPercent(value) {
    const numeric = number(value, 0);
    const percent = numeric > 1 ? numeric / 100 : numeric;
    return Math.max(0, Math.min(1, percent));
  }

  function createGpuHudRectangleValues(rects) {
    const values = [];
    const sourceRects = Array.isArray(rects) ? rects : [];
    for (const rect of sourceRects.slice(0, HUD_RECT_COUNT)) {
      if (!rect || typeof rect !== "object") {
        continue;
      }

      const left = normalizeGpuRectPercent(rect.left ?? rect.Left ?? 0);
      const top = normalizeGpuRectPercent(rect.top ?? rect.Top ?? 0);
      const right = normalizeGpuRectPercent(number(rect.left ?? rect.Left, 0) + number(rect.width ?? rect.Width, 0));
      const bottom = normalizeGpuRectPercent(number(rect.top ?? rect.Top, 0) + number(rect.height ?? rect.Height, 0));
      if (right <= left || bottom <= top) {
        continue;
      }

      const color = Array.isArray(rect.color || rect.Color)
        ? (rect.color || rect.Color)
        : gpuRectColor(rect.kind || rect.Kind, rect.type || rect.Type);
      values.push(
        left,
        top,
        right,
        bottom,
        clamp01(number(color[0], 0)),
        clamp01(number(color[1], 0)),
        clamp01(number(color[2], 0)),
        clamp01(number(rect.alpha ?? rect.Alpha, 0.68))
      );
    }

    return values;
  }

  function gpuFlatBufferLayout(name, stride, maxItems, fields, maxFloats) {
    const itemLimit = Math.max(0, number(maxItems, 0));
    const itemStride = Math.max(0, number(stride, 0));
    const floatLimit = Math.max(0, number(maxFloats, itemStride > 0 && itemLimit > 0 ? itemStride * itemLimit : 0));
    return {
      name,
      version: 1,
      stride: itemStride,
      maxItems: itemLimit,
      maxFloats: floatLimit,
      fields: Array.isArray(fields) ? fields.slice() : [],
      summary: `${name} v1 stride${itemStride} max${itemLimit}`
    };
  }

  function gpuFlatBufferLayoutSummary(layout) {
    return String(layout?.summary || layout?.Summary || "").trim();
  }

  function gpuMatrixKindSummary(matrices) {
    const kinds = Array.isArray(matrices)
      ? matrices
        .map(matrix => String(matrix?.kind || matrix?.Kind || "").trim())
        .filter(Boolean)
      : [];
    return kinds.length > 0 ? `matrices=${kinds.join("+")}` : "matrices=none";
  }

  function gpuMatrixFloatCount(matrices) {
    if (!Array.isArray(matrices) || matrices.length === 0) {
      return 0;
    }

    return matrices.reduce((total, matrix) => {
      const rows = Math.max(0, number(matrix?.rows ?? matrix?.Rows, 0));
      const columns = Math.max(0, number(matrix?.columns ?? matrix?.Columns, 0));
      const values = Array.isArray(matrix?.values || matrix?.Values) ? (matrix.values || matrix.Values) : [];
      const valueCount = Math.min(values.length, rows > 0 && columns > 0 ? rows * columns : values.length);
      return total + 4 + Math.max(0, valueCount);
    }, 0);
  }

  function gpuMatrixKindCode(kind) {
    const text = String(kind || "").toLowerCase();
    if (text.includes("topos")) {
      return 1;
    }

    if (text.includes("route")) {
      return 2;
    }

    if (text.includes("threat") || text.includes("combat")) {
      return 3;
    }

    if (text.includes("zoe") || text.includes("veto")) {
      return 4;
    }

    if (text.includes("ctg") || text.includes("state")) {
      return 5;
    }

    return 0;
  }

  function flattenGpuMatrices(matrices, stateVector) {
    const output = [];
    const maxFloats = GPU_AISTHESIS_MATRIX_FLOAT_COUNT;
    if (Array.isArray(matrices)) {
      for (const matrix of matrices) {
        if (output.length >= maxFloats - 4) {
          break;
        }

        const rows = Math.max(1, Math.min(GPU_STATE_VECTOR_FLOAT_COUNT, Math.floor(number(matrix?.rows ?? matrix?.Rows, 1))));
        const columns = Math.max(1, Math.min(GPU_STATE_VECTOR_FLOAT_COUNT, Math.floor(number(matrix?.columns ?? matrix?.Columns, 1))));
        const values = Array.isArray(matrix?.values || matrix?.Values)
          ? Array.from(matrix.values || matrix.Values)
          : [];
        const valueCount = Math.min(values.length, rows * columns, maxFloats - output.length - 4);
        output.push(gpuMatrixKindCode(matrix?.kind || matrix?.Kind), rows, columns, valueCount);
        for (let index = 0; index < valueCount; index += 1) {
          output.push(clamp01(values[index]));
        }
      }
    }

    if (output.length === 0 && Array.isArray(stateVector) && stateVector.length > 0 && output.length < maxFloats - 4) {
      const valueCount = Math.min(stateVector.length, GPU_STATE_VECTOR_FLOAT_COUNT, maxFloats - output.length - 4);
      output.push(5, 1, GPU_STATE_VECTOR_FLOAT_COUNT, valueCount);
      for (let index = 0; index < valueCount; index += 1) {
        output.push(clamp01(stateVector[index]));
      }
    }

    return output;
  }

  function gpuFrameTarget(kind, target, wireName, usage, hudExcluded) {
    return {
      kind,
      target,
      wireName,
      usage,
      hudExcluded: Boolean(hudExcluded)
    };
  }

  function gpuReadbackPolicy(kind, wireName, allowsSummary, allowsFullReadback, debugOnly) {
    return {
      kind,
      wireName,
      allowsSummary: Boolean(allowsSummary),
      allowsFullReadback: Boolean(allowsFullReadback),
      debugOnly: Boolean(debugOnly)
    };
  }

  function gpuFrameToken(rawTarget = RAW_FRAMEBUFFER_TARGET, hudTarget = HUD_COMPOSITE_TARGET, phase = "dto-fallback") {
    return GPU_CONTRACTS.frameToken(phase, rawTarget, hudTarget);
  }

  function gpuLabelFromCandidate(kind, candidate, slot) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const score = clamp01(maxValue(candidate.score, candidate.Score));
    const redScore = clamp01(maxValue(candidate.redScore, candidate.RedScore));
    const edgeScore = clamp01(maxValue(candidate.edgeScore, candidate.EdgeScore));
    const left = number(candidate.left ?? candidate.Left, NaN);
    const top = number(candidate.top ?? candidate.Top, NaN);
    const width = number(candidate.width ?? candidate.Width, NaN);
    const height = number(candidate.height ?? candidate.Height, NaN);
    const rect = Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(width) && Number.isFinite(height)
      ? { left, top, width, height, anchor: "below" }
      : null;
    return gpuLabel(
      kind === "door" ? "is-door is-door-candidate" : "is-wall is-corner-candidate",
      kind === "door" ? "DOOR" : "CORNER",
      `score=${score.toFixed(2)} red=${redScore.toFixed(2)} edge=${edgeScore.toFixed(2)}`,
      kind === "door" ? "high" : "mid",
      slot,
      "gpu-hud-rect",
      true,
      rect
    );
  }

  function gpuLabelFromRegion(region, slot) {
    if (!region || typeof region !== "object" || !isGpuPriorityRegion(region)) {
      return null;
    }

    const kind = String(region.kind || region.Kind || "diagnostic").toLowerCase();
    const left = number(region.left ?? region.Left, NaN);
    const top = number(region.top ?? region.Top, NaN);
    const width = number(region.width ?? region.Width, NaN);
    const height = number(region.height ?? region.Height, NaN);
    const rect = Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(width) && Number.isFinite(height)
      ? { left, top, width, height, anchor: "inside" }
      : null;
    const className = region.className || region.ClassName || `is-${kind}`;
    return gpuLabel(
      className,
      region.label || region.Label || kind.toUpperCase(),
      region.value || region.Value || "",
      String(region.priority || region.Priority || "mid").toLowerCase(),
      slot,
      "gpu-hud-rect",
      region.active ?? region.Active ?? true,
      rect
    );
  }

  function gpuLabelFromEnemyCircle(circle, slot) {
    if (!circle || !circle.active) {
      return null;
    }

    const type = String(circle.type || "visual").toLowerCase();
    const direction = String(circle.direction || "front").toLowerCase();
    const confidence = clamp01(circle.confidence);
    const label = type === "audio" ? "ENEMY AUDIO" : (type === "av" ? "ENEMY A/V" : "ENEMY");
    return gpuLabel(
      `is-enemy-circle is-enemy-circle-${type}`,
      label,
      `${type} ${direction} ${confidence.toFixed(2)}`,
      "high",
      slot,
      "gpu-hud-rect",
      true,
      {
        left: number(circle.left, 0),
        top: number(circle.top, 0),
        width: number(circle.width, 0),
        height: number(circle.height, 0),
        anchor: "below"
      }
    );
  }

  function appendGpuRadarLabels(labels) {
    const radarLabels = [
      ["is-radar-label is-radar-front", "FRONT", 84.9, 3.4, 7.2, 3.0],
      ["is-radar-label is-radar-left", "L-TURN", 75.0, 15.5, 8.4, 3.0],
      ["is-radar-label is-radar-right", "R-TURN", 92.3, 15.5, 8.4, 3.0],
      ["is-radar-label is-radar-rear", "REAR", 84.9, 29.3, 7.2, 3.0]
    ];
    for (const [className, label, left, top, width, height] of radarLabels) {
      appendGpuLabel(labels, gpuLabel(
        className,
        label,
        "",
        "low",
        labels.length,
        "ego-radar-js-label",
        true,
        { left, top, width, height, anchor: "inside" }
      ));
    }
  }

  function createGpuHudPanelValues(values, pipelineState, action) {
    const noesis = pipelineState?.noesis || {};
    const topology = noesis.topology || {};
    const kairos = pipelineState?.krisis?.kairos || {};
    const kinesis = pipelineState?.kinesis || {};
    const zoe = kinesis.zoe || {};
    const routeConfidence = clamp01(number(values.routeConfidence, 0));
    const loopBudget = clamp01(values.routeLoopBudgetExceeded ? 1 : maxValue(
      number(values.routePivotBudget, 0) > 0 ? number(values.routePivotUsed, 0) / number(values.routePivotBudget, 1) : 0,
      number(values.routeSlideBudget, 0) > 0 ? number(values.routeSlideUsed, 0) / number(values.routeSlideBudget, 1) : 0,
      number(values.routeBackoffBudget, 0) > 0 ? number(values.routeBackoffUsed, 0) / number(values.routeBackoffBudget, 1) : 0));
    const actionActive = action?.move !== "none" || action?.turn !== "none" || action?.use || action?.fire || action?.strafe;
    const combat = clamp01(maxValue(values.enemyConfidence, values.audioEnemyConfidence, values.visualEnemyFireReady ? 0.50 : 0, action?.fire ? 1 : 0));
    const zoeValue = clamp01(maxValue(zoe.vetoed ? 1 : 0, zoe.lethalRisk, zoe.lowHealth ? 0.55 : 0));
    return [
      clamp01(maxValue(values.gameplayLuma, values.blueFloorScore, values.spawnCorridorGapScore)),
      clamp01(maxValue(noesis.confidenceFusion, routeConfidence, values.routeTopologyBarrelZoneEvidence)),
      clamp01(maxValue(kairos.logos, kairos.pathos, kairos.ethos)),
      clamp01(maxValue(actionActive ? 0.72 : 0, number(kinesis.actionRepeatFrames, 0) / 30)),
      routeConfidence,
      loopBudget,
      clamp01(maxValue(values.firstDoorRouteEvidence, values.useProbeConfidence, values.firstDoorVision9x9Score)),
      combat,
      zoeValue,
      clamp01(kairos.logos),
      clamp01(kairos.pathos),
      clamp01(kairos.ethos),
      clamp01(number(topology.wallDistanceNormalized ?? values.routeTopologyWallDistanceNormalized, 1)),
      clamp01(number(topology.barrelZoneEvidence ?? values.routeTopologyBarrelZoneEvidence, 0)),
      clamp01((number(topology.centerCorridorAlignment ?? values.routeTopologyCenterCorridorAlignment, 0) + 1) / 2),
      clamp01(number(kinesis.usePulseCooldownFrames ?? values.usePulseCooldownFrames, 0) / 90)
    ];
  }

  function createGpuHudOverlay(values, pipelineState, action, regions, visionCandidates, enemyCircle) {
    const rects = [];
    const labels = [];
    for (const candidate of visionCandidates?.doorCandidates || []) {
      appendGpuRect(rects, gpuRectFromCandidate("door", candidate, 0.86));
      appendGpuLabel(labels, gpuLabelFromCandidate("door", candidate, labels.length));
    }
    for (const candidate of visionCandidates?.cornerCandidates || []) {
      appendGpuRect(rects, gpuRectFromCandidate("corner", candidate, 0.62));
      appendGpuLabel(labels, gpuLabelFromCandidate("corner", candidate, labels.length));
    }
    appendGpuRect(rects, gpuRectFromEnemyCircle(enemyCircle));
    appendGpuLabel(labels, gpuLabelFromEnemyCircle(enemyCircle, labels.length));
    appendGpuRadarLabels(labels);
    for (const region of regions || []) {
      appendGpuRect(rects, gpuRectFromRegion(region));
      appendGpuLabel(labels, gpuLabelFromRegion(region, labels.length));
    }

    const zoe = pipelineState?.kinesis?.zoe || {};
    const zoeRisk = clamp01(maxValue(zoe.vetoed ? 1 : 0, zoe.lethalRisk));
    if (zoeRisk > 0.25) {
      appendGpuRect(rects, {
        kind: "zoe",
        left: 1,
        top: 1,
        width: 98,
        height: 98,
        score: zoeRisk,
        alpha: 0.62,
        color: gpuRectColor("zoe")
      });
    }
    const rectangleValues = createGpuHudRectangleValues(rects);

    return {
      contractVersion: 1,
      contractName: "DoomGpuHudOverlay",
      enabled: true,
      cssOverlayMode: "reduced",
      rawFramebufferTarget: RAW_FRAMEBUFFER_TARGET,
      rawFrameTarget: gpuFrameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
      hudTarget: HUD_COMPOSITE_TARGET,
      hudFrameTarget: gpuFrameTarget("HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
      analysisCaptureSource: RAW_FRAMEBUFFER_WIRE_NAME,
      analysisFrameTarget: gpuFrameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
      displaySource: HUD_COMPOSITE_WIRE_NAME,
      displayFrameTarget: gpuFrameTarget("HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
      readbackPolicy: "none",
      readback: gpuReadbackPolicy("None", "none", false, false, false),
      frameToken: gpuFrameToken(RAW_FRAMEBUFFER_TARGET, HUD_COMPOSITE_TARGET, "hud-fallback"),
      featureFlags: ["hud-composite", "cells9x9", "rect8-flat", "panel16", "css-labels"],
      panelValues: createGpuHudPanelValues(values, pipelineState, action),
      panelLayout: `${HUD_PANEL_LAYOUT_NAME}:${HUD_PANEL_FIELDS.join(",")}`,
      panelBufferLayout: gpuFlatBufferLayout(HUD_PANEL_LAYOUT_NAME, HUD_PANEL_VALUE_COUNT, 1, HUD_PANEL_FIELDS),
      cells: normalizeVision9x9Projection(values),
      rectangles: rects,
      rectangleValues,
      rectangleFloatCount: rectangleValues.length,
      rectangleStride: HUD_RECT_STRIDE,
      rectangleLayout: `rect${HUD_RECT_STRIDE}:${HUD_RECT_FIELDS.join(",")}`,
      rectangleBufferLayout: gpuFlatBufferLayout(`rect${HUD_RECT_STRIDE}`, HUD_RECT_STRIDE, HUD_RECT_COUNT, HUD_RECT_FIELDS),
      labels
    };
  }

  function createGpuAisthesis(values, pipelineState, action) {
    const routePlan = pipelineState?.aisthesis?.routePlan || {};
    const combat = maxValue(values.enemyConfidence, values.audioEnemyConfidence, action?.fire ? 1 : 0) > 0.08;
    const door = maxValue(values.firstDoorRouteEvidence, values.useProbeConfidence, values.firstDoorVision9x9RedScore) > 0.04;
    const corner = Boolean(routePlan.routeWallObstacle || routePlan.routeFootObstacle || values.routeWallObstacle || values.routeFootObstacle);
    const features = ["vision-heatmap", "edge-detect", "mask9x9-texture"];
    if (door) {
      features.push("red-panel-detect");
    }
    if (corner) {
      features.push("corner-detect");
    }
    if (combat) {
      features.push("enemy-direction", "projectile-flow");
    }
    const matrices = createGpuSpatialMatrices(values, pipelineState, action, combat);
    const stateVector = createGpuSpatialStateVector(values, pipelineState, action, combat);
    const matrixBufferLayout = gpuFlatBufferLayout("matrix", 0, 0, ["kind", "rows", "columns", "count", "values"], GPU_AISTHESIS_MATRIX_FLOAT_COUNT);
    const stateVectorBufferLayout = gpuFlatBufferLayout(GPU_STATE_VECTOR_LAYOUT_NAME, GPU_STATE_VECTOR_FLOAT_COUNT, 1, GPU_STATE_VECTOR_FIELDS);
    const matrixKinds = matrices.map(matrix => matrix.kind);
    const matrixValues = flattenGpuMatrices(matrices, stateVector);
    const matrixFloatCount = Math.max(gpuMatrixFloatCount(matrices), matrixValues.length);

    return {
      contractVersion: 1,
      contractName: "DoomGpuAisthesis",
      enabled: true,
      inputTarget: RAW_FRAMEBUFFER_TARGET,
      inputFrameTarget: gpuFrameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
      hudTarget: HUD_COMPOSITE_TARGET,
      hudFrameTarget: gpuFrameTarget("HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
      captureSource: RAW_FRAMEBUFFER_WIRE_NAME,
      captureFrameTarget: gpuFrameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
      readbackPolicy: "debug-only",
      readback: gpuReadbackPolicy("DebugOnly", "debug-only", true, true, true),
      frameToken: gpuFrameToken(RAW_FRAMEBUFFER_TARGET, HUD_COMPOSITE_TARGET, "gpu-aisthesis-js-adapter"),
      output: combat ? "vector+mask+heatmap" : "heatmap+vector",
      maskTextureEnabled: true,
      maskTextureTarget: GPU_AISTHESIS_MASK_TARGET,
      maskTexture: GPU_CONTRACTS.aisthesisMaskTextureTarget(),
      maskTextureLayout: GPU_AISTHESIS_MASK_LAYOUT,
      visionHeatmap: true,
      edgeDetect: true,
      cornerDetect: corner,
      redPanelDetect: door,
      enemyDirection: combat,
      projectileFlow: combat,
      features,
      matrixKinds,
      matrixKindSummary: gpuMatrixKindSummary(matrices),
      matrices,
      stateVector,
      matrixValues,
      matrixLayout: "matrix:kind,rows,columns,count,values",
      matrixBufferLayout,
      stateVectorLayout: `${GPU_STATE_VECTOR_LAYOUT_NAME}:${GPU_STATE_VECTOR_FIELDS.join(",")}`,
      stateVectorBufferLayout,
      bufferLayoutSummary: `${gpuFlatBufferLayoutSummary(matrixBufferLayout)}; ${gpuFlatBufferLayoutSummary(stateVectorBufferLayout)}`,
      matrixCount: matrices.length,
      matrixFloatCount,
      featureCount: features.length,
      summary: `gpu=dto m${matrices.length} f${matrixFloatCount} mask9x9 ${features.slice(0, 2).join("+") || "features"}`
    };
  }

  function createGpuSpatialReasoning(gpuAisthesis) {
    const matrixCount = number(gpuAisthesis?.matrixCount ?? gpuAisthesis?.MatrixCount ?? gpuAisthesis?.matrices?.length ?? 0, 0);
    const matrixFloatCount = number(gpuAisthesis?.matrixFloatCount ?? gpuAisthesis?.MatrixFloatCount ?? gpuAisthesis?.matrixValues?.length ?? 0, 0);
    const featureCount = number(gpuAisthesis?.featureCount ?? gpuAisthesis?.FeatureCount ?? gpuAisthesis?.features?.length ?? 0, 0);
    const featureFlags = ["topos-reduce", "route-reduce", "threat-reduce", "zoe-reduce", "ctg-normalize", "mask-texture-reduce"];
    const outputVectorLayout = gpuFlatBufferLayout(GPU_SPATIAL_OUTPUT_LAYOUT_NAME, GPU_SPATIAL_OUTPUT_FLOAT_COUNT, 1, GPU_SPATIAL_OUTPUT_FIELDS);
    return {
      contractVersion: 1,
      contractName: "DoomGpuSpatialReasoning",
      enabled: Boolean(gpuAisthesis?.enabled ?? gpuAisthesis?.Enabled),
      inputSource: GPU_AISTHESIS_FEATURE_TARGET,
      matrixSource: GPU_AISTHESIS_MATRIX_TARGET,
      maskTextureSource: gpuAisthesis?.maskTextureTarget || gpuAisthesis?.MaskTextureTarget || GPU_AISTHESIS_MASK_TARGET,
      maskTexture: gpuAisthesis?.maskTexture || gpuAisthesis?.MaskTexture || GPU_CONTRACTS.aisthesisMaskTextureTarget(),
      maskTextureLayout: gpuAisthesis?.maskTextureLayout || gpuAisthesis?.MaskTextureLayout || GPU_AISTHESIS_MASK_LAYOUT,
      outputTarget: GPU_SPATIAL_OUTPUT_TARGET,
      inputFrameTarget: gpuAisthesis?.inputFrameTarget || gpuAisthesis?.InputFrameTarget || gpuFrameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
      hudFrameTarget: gpuAisthesis?.hudFrameTarget || gpuAisthesis?.HudFrameTarget || gpuFrameTarget("HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
      readbackPolicy: "runtime-summary",
      readback: gpuReadbackPolicy("RuntimeSummary", "runtime-summary", true, false, false),
      frameToken: gpuFrameToken(RAW_FRAMEBUFFER_TARGET, HUD_COMPOSITE_TARGET, "gpu-spatial-js-adapter"),
      featureFlags,
      featureFlagSummary: `reducers=${featureFlags.join("+")}`,
      matrixKinds: Array.isArray(gpuAisthesis?.matrixKinds || gpuAisthesis?.MatrixKinds)
        ? Array.from(gpuAisthesis.matrixKinds || gpuAisthesis.MatrixKinds).map(value => String(value))
        : [],
      matrixKindSummary: gpuAisthesis?.matrixKindSummary || gpuAisthesis?.MatrixKindSummary || gpuMatrixKindSummary(gpuAisthesis?.matrices || gpuAisthesis?.Matrices || []),
      output: "summary",
      outputVectorLayout,
      outputFloatCount: GPU_SPATIAL_OUTPUT_FLOAT_COUNT,
      outputLayoutSummary: gpuFlatBufferLayoutSummary(outputVectorLayout),
      matrixCount,
      matrixFloatCount,
      featureCount,
      summary: `spatial=dto m${matrixCount} f${matrixFloatCount} feat${featureCount} mask9x9 ${GPU_SPATIAL_OUTPUT_LAYOUT_NAME}`
    };
  }

  function createGpuSpatialMatrices(values, pipelineState, action, combat) {
    const matrices = [
      createGpuMatrix("topos9x9", HUD_GRID_SIZE, HUD_GRID_SIZE, createGpuToposMatrix(values, pipelineState)),
      createGpuMatrix("route-cost9x9", HUD_GRID_SIZE, HUD_GRID_SIZE, createGpuRouteCostMatrix(values, pipelineState)),
      createGpuMatrix("ctg-state", 1, GPU_STATE_VECTOR_FLOAT_COUNT, createGpuSpatialStateVector(values, pipelineState, action, combat))
    ];
    if (combat) {
      matrices.push(createGpuMatrix("threat9x9", HUD_GRID_SIZE, HUD_GRID_SIZE, createGpuThreatMatrix(values, action)));
    }
    const zoe = pipelineState?.kinesis?.zoe || {};
    if (zoe.warning || zoe.vetoed || number(zoe.lethalRisk, 0) > 0.08) {
      matrices.push(createGpuMatrix("zoe-veto9x9", HUD_GRID_SIZE, HUD_GRID_SIZE, createGpuZoeMatrix(zoe)));
    }
    return matrices;
  }

  function createGpuMatrix(kind, rows, columns, values) {
    const count = Math.max(0, rows * columns);
    const normalized = new Array(count).fill(0);
    for (let index = 0; index < count; index += 1) {
      normalized[index] = clamp01(values?.[index] ?? 0);
    }
    return { kind, rows, columns, values: normalized };
  }

  function createGpuToposMatrix(values, pipelineState) {
    const topology = pipelineState?.noesis?.topology || {};
    const routeConfidence = clamp01(number(values.routeConfidence, 0));
    const routeEvidence = clamp01(maxValue(values.firstDoorRouteEvidence, values.useProbeConfidence));
    const yaw = Math.max(-1, Math.min(1, number(values.recommendedYaw || values.routeFallbackYaw, 0) / 45));
    const centerPull = Math.max(-1, Math.min(1, number(topology.centerlineDirectionX ?? values.routeTopologyCenterlineDirectionX, 0)));
    const barrel = clamp01(number(topology.barrelZoneEvidence ?? values.routeTopologyBarrelZoneEvidence, 0));
    const route = Math.max(routeConfidence, routeEvidence);
    const output = [];
    const centerIndex = Math.floor((HUD_GRID_SIZE - 1) / 2);
    const centerScale = Math.max(1, centerIndex);
    for (let row = 0; row < HUD_GRID_SIZE; row += 1) {
      for (let column = 0; column < HUD_GRID_SIZE; column += 1) {
        const forward = 1 - Math.abs(row - 2) / Math.max(1, HUD_GRID_SIZE - 3);
        const corridor = 1 - Math.abs((column - centerIndex) / centerScale - yaw);
        const center = 1 - Math.abs((column - centerIndex) / centerScale - centerPull);
        output.push(clamp01(route * 0.50 + forward * corridor * 0.30 + center * (1 - barrel) * 0.20));
      }
    }
    return output;
  }

  function createGpuRouteCostMatrix(values, pipelineState) {
    const topology = pipelineState?.noesis?.topology || {};
    const wallDistance = clamp01(number(topology.wallDistanceNormalized ?? values.routeTopologyWallDistanceNormalized, 1));
    const wallCost = 1 - wallDistance;
    const barrel = clamp01(number(topology.barrelZoneEvidence ?? values.routeTopologyBarrelZoneEvidence, 0));
    const deadEnd = Boolean(topology.deadEndRisk ?? values.routeTopologyDeadEndRisk);
    const yaw = Math.max(-1, Math.min(1, number(values.recommendedYaw || values.routeFallbackYaw, 0) / 45));
    const output = [];
    const centerIndex = Math.floor((HUD_GRID_SIZE - 1) / 2);
    const centerScale = Math.max(1, centerIndex);
    for (let row = 0; row < HUD_GRID_SIZE; row += 1) {
      for (let column = 0; column < HUD_GRID_SIZE; column += 1) {
        const side = Math.abs(column - centerIndex) / centerScale;
        const routeSide = Math.abs((column - centerIndex) / centerScale - yaw);
        const forwardPenalty = row > 5 ? 0.18 : 0;
        output.push(clamp01(wallCost * side * 0.34 + barrel * routeSide * 0.46 + forwardPenalty + (deadEnd ? 0.18 : 0)));
      }
    }
    return output;
  }

  function createGpuThreatMatrix(values, action) {
    const enemy = clamp01(maxValue(values.enemyConfidence, values.audioEnemyConfidence, values.threatField));
    const yaw = Math.max(-1, Math.min(1, number(action?.yaw ?? action?.turnYaw ?? values.enemyCombatYaw, 0) / 32));
    const output = [];
    const centerIndex = Math.floor((HUD_GRID_SIZE - 1) / 2);
    const centerScale = Math.max(1, centerIndex);
    for (let row = 0; row < HUD_GRID_SIZE; row += 1) {
      for (let column = 0; column < HUD_GRID_SIZE; column += 1) {
        const horizontal = 1 - Math.abs((column - centerIndex) / centerScale - yaw);
        const nearCenter = 1 - Math.abs(row - centerIndex) / centerScale;
        output.push(clamp01(enemy * Math.max(0, horizontal) * Math.max(0.25, nearCenter)));
      }
    }
    return output;
  }

  function createGpuZoeMatrix(zoe) {
    const risk = clamp01(maxValue(zoe.vetoed ? 1 : 0, zoe.lethalRisk, zoe.lowHealth ? 0.55 : 0));
    const output = [];
    const centerIndex = Math.floor((HUD_GRID_SIZE - 1) / 2);
    for (let row = 0; row < HUD_GRID_SIZE; row += 1) {
      for (let column = 0; column < HUD_GRID_SIZE; column += 1) {
        const centerDistance = Math.abs(row - centerIndex) + Math.abs(column - centerIndex);
        output.push(clamp01(risk * (centerDistance <= 2 ? 1 : 0.42)));
      }
    }
    return output;
  }

  function createGpuSpatialStateVector(values, pipelineState, action, combat) {
    const kairos = pipelineState?.krisis?.kairos || {};
    const topology = pipelineState?.noesis?.topology || {};
    const zoe = pipelineState?.kinesis?.zoe || {};
    return [
      clamp01(kairos.logos),
      clamp01(kairos.pathos),
      clamp01(kairos.ethos),
      clamp01(values.routeConfidence),
      clamp01(values.firstDoorRouteEvidence),
      clamp01(values.useProbeConfidence),
      clamp01(topology.wallDistanceNormalized ?? values.routeTopologyWallDistanceNormalized),
      clamp01(topology.barrelZoneEvidence ?? values.routeTopologyBarrelZoneEvidence),
      clamp01((number(topology.centerCorridorAlignment ?? values.routeTopologyCenterCorridorAlignment, 0) + 1) / 2),
      clamp01(combat ? 1 : 0),
      clamp01(maxValue(values.enemyConfidence, values.audioEnemyConfidence, values.threatField)),
      clamp01(zoe.lethalRisk),
      clamp01(zoe.lowHealth ? 1 : 0),
      clamp01(action?.move === "forward" ? 1 : 0),
      clamp01(Math.abs(number(action?.yaw ?? action?.turnYaw ?? 0)) / 32),
      clamp01(action?.use ? 1 : 0)
    ];
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

  function priorityHudKind(axis, action) {
    if (action?.fire) {
      return "objective-pathos";
    }

    if (action?.use) {
      return "objective-use";
    }

    const normalized = String(axis || "logos").toLowerCase();
    return normalized === "pathos" || normalized === "ethos"
      ? `objective-${normalized}`
      : "objective-logos";
  }

  function priorityHudClassName(axis, action) {
    const normalized = String(axis || "logos").toLowerCase();
    const safeAxis = normalized === "pathos" || normalized === "ethos" ? normalized : "logos";
    const actionClass = action?.fire ? " is-fire" : (action?.use ? " is-use" : "");
    return `is-objective is-priority-axis is-axis-${safeAxis}${actionClass}`;
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
        kind: priorityHudKind(selectedAxis, action),
        className: priorityHudClassName(selectedAxis, action),
        label: "PRIORITY:",
        value: goalState.priority,
        left: 3.0,
        top: 55.0,
        width: 25.5,
        height: 8.4,
        priority: "high",
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
    const combatScore = clamp01(maxValue(
      values.enemyConfidence,
      values.audioEnemyConfidence,
      values.visualEnemyFireReady ? 0.50 : 0,
      action?.fire ? 1 : 0));
    const combatText = `${action?.stage || ""} ${action?.pipeline || ""} ${action?.objective || ""}`;
    const combatOverlayContext = number(values.doorOpenedCount, 0) > 0
      || Boolean(values.computerRoomCombatContext)
      || Boolean(values.centralHallEntered)
      || Boolean(action?.fire)
      || /combat|enemy|fire/i.test(combatText);
    let debugEnemyCircle = null;
    if (combatOverlayContext && (combatScore >= 0.24 || /combat|enemy|fire/i.test(combatText))) {
      const enemyCircle = enemyCirclePacket(values, action, combatScore);
      regions.push({
        kind: "combat",
        label: "COMBAT",
        value: `vis=${enemyCircle.visualConfidence.toFixed(2)} aud=${enemyCircle.audioConfidence.toFixed(2)} ${enemyCircle.direction} yaw=${enemyCircle.yaw.toFixed(0)} ${action?.fire ? "FIRE" : "HOLD"}`,
        left: 28,
        top: 5,
        width: 44,
        height: 12,
        priority: "high",
        active: true
      });
      if (enemyCircle.active) {
        regions.push({
          kind: "enemy-circle",
          type: enemyCircle.type,
          source: enemyCircle.source,
          yaw: enemyCircle.yaw,
          confidence: enemyCircle.confidence,
          label: enemyCircle.type === "audio" ? "ENEMY AUDIO" : (enemyCircle.type === "av" ? "ENEMY A/V" : "ENEMY"),
          value: `${enemyCircle.type} ${enemyCircle.direction} ${enemyCircle.confidence.toFixed(2)}`,
          left: enemyCircle.left,
          top: enemyCircle.top,
          width: enemyCircle.width,
          height: enemyCircle.height,
          priority: "high",
          active: true
        });
        debugEnemyCircle = enemyCircle;
      }
    }
    const zoe = pipelineState?.kinesis?.zoe || {};
    if (zoe.vetoed || zoe.warning || zoe.lowHealth || number(zoe.lethalRisk, 0) >= 0.50) {
      regions.push({
        kind: "zoe",
        label: zoe.vetoed ? "ZOE VETO" : "ZOE WARN",
        value: `hp=${Math.round(number(zoe.health, number(values.health, 100)))} risk=${clamp01(number(zoe.lethalRisk, 0)).toFixed(2)} ${zoe.lastReason || "health"}`,
        left: 4,
        top: 5,
        width: 28,
        height: 8,
        priority: zoe.vetoed ? "high" : "mid",
        active: true
      });
    }

    const yaw = turnYawFromAction(action, number(values.recommendedYaw, 0) || number(values.routeFallbackYaw, 0));
    const visionCandidates = createVisionCandidates(values);
    const gpuHud = createGpuHudOverlay(values, pipelineState, action, regions, visionCandidates, debugEnemyCircle);
    const gpuAisthesis = createGpuAisthesis(values, pipelineState, action);
    const gpuSpatialReasoning = createGpuSpatialReasoning(gpuAisthesis);
    return {
      vision9x9: normalizeVision9x9Projection(values),
      doorCandidates: visionCandidates.doorCandidates,
      cornerCandidates: visionCandidates.cornerCandidates,
      grid,
      regions,
      enemyCircle: debugEnemyCircle,
      gpuHud,
      gpuAisthesis,
      gpuSpatialReasoning,
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
      routeCorridorBridgeLock: Boolean(values.routeCorridorBridgeLock),
      routeCorridorBridgeLockFrames: Math.max(0, Math.floor(number(values.routeCorridorBridgeLockFrames, 0))),
      routePostDoorBridgeDoorMemory: Boolean(values.routePostDoorBridgeDoorMemory),
      routePostDoorBridgeDoorMemoryFrames: Math.max(0, Math.floor(number(values.routePostDoorBridgeDoorMemoryFrames, 0))),
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
    const canonicalAutoplayState = resolveCanonicalAutoplayState(action, context);
    const pipelineState = resolveCanonicalPipelineState(action, context)
      || canonicalAutoplayState?.pipelineState
      || canonicalAutoplayState?.PipelineState
      || createPipelineState(action, context);
    const goalState = resolveCanonicalGoalState(action, context, canonicalAutoplayState)
      || createGoalState(action, context, pipelineState);
    const debugOverlay = resolveCanonicalDebugOverlay(action, context, canonicalAutoplayState)
      || createDebugOverlay(action, context, pipelineState, goalState);
    const autoplayState = completeCanonicalAutoplayState(canonicalAutoplayState, pipelineState, goalState, debugOverlay)
      || createAutoplayState(action, context, pipelineState, goalState, debugOverlay);
    const kairosPriorityAxis = pipelineState?.krisis?.kairos || resolveKairosPriorityAxis(action, context);

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
      enemyConfidence: number(context?.values?.enemyConfidence, 0),
      audioEnemyConfidence: number(context?.values?.audioEnemyConfidence, 0),
      audioEnemyDirection: context?.values?.audioEnemyDirection || "none",
      visualEnemyVisible: Boolean(context?.values?.visualEnemyVisible),
      visualEnemyCentered: Boolean(context?.values?.visualEnemyCentered),
      visualEnemyYaw: number(context?.values?.visualEnemyYaw, 0),
      visualEnemyFireReady: Boolean(context?.values?.visualEnemyFireReady),
      enemyCombatYaw: number(context?.values?.enemyCombatYaw, 0),
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
        routeLoopBudgetSource: context?.values?.routeLoopBudgetSource || "unknown",
        routeLoopBudgetExceeded: Boolean(context?.values?.routeLoopBudgetExceeded),
        routePivotUsed: number(context?.values?.routePivotUsed, 0),
        routePivotBudget: number(context?.values?.routePivotBudget, 0),
        routeSlideUsed: number(context?.values?.routeSlideUsed, 0),
        routeSlideBudget: number(context?.values?.routeSlideBudget, 0),
        routeBackoffUsed: number(context?.values?.routeBackoffUsed, 0),
        routeBackoffBudget: number(context?.values?.routeBackoffBudget, 0),
        routeAdvanceUsed: number(context?.values?.routeAdvanceUsed, 0),
        routeAdvanceBudget: number(context?.values?.routeAdvanceBudget, 0),
        routeIngressUsed: number(context?.values?.routeIngressUsed, 0),
        routeIngressBudget: number(context?.values?.routeIngressBudget, 0),
        routeRecoverUsed: number(context?.values?.routeRecoverUsed, 0),
        routeRecoverBudget: number(context?.values?.routeRecoverBudget, 0),
        routeTopologyUsed: number(context?.values?.routeTopologyUsed, 0),
        routeTopologyBudget: number(context?.values?.routeTopologyBudget, 0),
        routeArcUsed: number(context?.values?.routeArcUsed, 0),
        routeArcBudget: number(context?.values?.routeArcBudget, 0),
        currentRoute: context?.values?.currentRoute || "unknown",
        currentLandmark: context?.values?.currentLandmark || "none",
        routeActionHint: context?.values?.routeActionHint || "none",
        routeConfidence: number(context?.values?.routeConfidence, 0),
        recommendedYaw: number(context?.values?.recommendedYaw, 0),
        useProbeConfidence: number(context?.values?.useProbeConfidence, 0),
        routeBarrelLaneRisk: Boolean(context?.values?.routeBarrelLaneRisk),
        routeBarrelLaneDetourRequired: Boolean(context?.values?.routeBarrelLaneDetourRequired),
        routeDeadEndRisk: Boolean(context?.values?.routeDeadEndRisk),
        routeDeadEndTrimRequired: Boolean(context?.values?.routeDeadEndTrimRequired),
        routeCorridorBridgeEvidence: number(context?.values?.routeCorridorBridgeEvidence, 0),
        routeCorridorBridgeLock: Boolean(context?.values?.routeCorridorBridgeLock),
        routeCorridorBridgeLockFrames: number(context?.values?.routeCorridorBridgeLockFrames, 0),
        routePostDoorBridgeDoorMemory: Boolean(context?.values?.routePostDoorBridgeDoorMemory),
        routePostDoorBridgeDoorMemoryFrames: number(context?.values?.routePostDoorBridgeDoorMemoryFrames, 0),
        routeTopologyWallDistanceNormalized: number(context?.values?.routeTopologyWallDistanceNormalized, 1),
        routeTopologyBarrelZoneEvidence: number(context?.values?.routeTopologyBarrelZoneEvidence, 0),
        routeTopologyCenterCorridorAlignment: number(context?.values?.routeTopologyCenterCorridorAlignment, 0),
        postDoorTerminalSurface: number(context?.values?.postDoorTerminalSurface, 0),
        computerRoomConfidence: number(context?.values?.computerRoomConfidence, 0),
        computerRoomScore: number(context?.values?.computerRoomScore, 0),
        computerPanelScore: number(context?.values?.computerPanelScore, 0),
        computerDarkPanelScore: number(context?.values?.computerDarkPanelScore, 0),
        bridgeConfidence: number(context?.values?.bridgeConfidence, 0),
        doorOpenedCount: number(context?.values?.doorOpenedCount, 0),
        centralHallEntered: Boolean(context?.values?.centralHallEntered),
        visualEnemyVisible: Boolean(context?.values?.visualEnemyVisible),
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
    resolveCanonicalPipelineState,
    turnFromYaw
  });

})();
