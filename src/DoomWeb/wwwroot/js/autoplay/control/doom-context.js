(function () {
  "use strict";

  function requireExpressionDsl(name) {
    const fn = self.AIKernelDoomExpressionDsl?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomExpressionDsl.${name} is not available.`);
    }

    return fn;
  }

  function requireRoutePlanner(name) {
    const fn = self.AIKernelDoomRoutePlanner?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomRoutePlanner.${name} is not available.`);
    }

    return fn;
  }

  function requireRouteLoopBudget(name) {
    const fn = self.AIKernelDoomRouteLoopBudget?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomRouteLoopBudget.${name} is not available.`);
    }

    return fn;
  }

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function readParameter(parameters, name) {
    return requireExpressionDsl("readParameter")(parameters, name);
  }

  function readObjectCaseInsensitive(source, names) {
    if (!source || typeof source !== "object") {
      return null;
    }

    for (let index = 0; index < names.length; index += 1) {
      const value = source[names[index]];
      if (value && typeof value === "object") {
        return value;
      }
    }

    return null;
  }

  function readValueCaseInsensitive(source, names) {
    if (!source || typeof source !== "object") {
      return undefined;
    }

    for (let index = 0; index < names.length; index += 1) {
      const value = source[names[index]];
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return undefined;
  }

  function routeMetric(packet, camelName, pascalName, fallback = 0) {
    return number(readValueCaseInsensitive(packet, [camelName, pascalName]), fallback);
  }

  function routeFlag(packet, camelName, pascalName, fallback = false) {
    const value = readValueCaseInsensitive(packet, [camelName, pascalName]);
    return value === undefined ? Boolean(fallback) : Boolean(value);
  }

  function hasCanonicalRouteLoopBudget(packet) {
    if (!packet || typeof packet !== "object") {
      return false;
    }

    return readValueCaseInsensitive(packet, [
      "routeLoopKind",
      "RouteLoopKind",
      "loopKind",
      "LoopKind",
      "routeAbortHint",
      "RouteAbortHint",
      "routeLoopBudgetExceeded",
      "RouteLoopBudgetExceeded",
      "exceeded",
      "Exceeded"
    ]) !== undefined;
  }

  function findCanonicalRouteLoopBudgetPacket(state) {
    const pipeline = readObjectCaseInsensitive(state, ["pipelineState", "PipelineState"]);
    const aisthesis = readObjectCaseInsensitive(pipeline, ["aisthesis", "Aisthesis"]);
    const autoplayState = readObjectCaseInsensitive(state, ["autoplayState", "AutoplayState"]);
    const candidates = [
      readObjectCaseInsensitive(state, ["routeLoopBudget", "RouteLoopBudget"]),
      readObjectCaseInsensitive(state, ["routePlan", "RoutePlan"]),
      readObjectCaseInsensitive(aisthesis, ["routePlan", "RoutePlan"]),
      readObjectCaseInsensitive(autoplayState, ["routePlan", "RoutePlan"]),
      readObjectCaseInsensitive(autoplayState, ["debugRouteValues", "DebugRouteValues"]),
      readObjectCaseInsensitive(state, ["debugRouteValues", "DebugRouteValues"])
    ];

    for (let index = 0; index < candidates.length; index += 1) {
      if (hasCanonicalRouteLoopBudget(candidates[index])) {
        return candidates[index];
      }
    }

    return null;
  }

  function canonicalRouteLoopBudget(state, fallback) {
    const packet = findCanonicalRouteLoopBudgetPacket(state);
    if (!packet) {
      return Object.assign({ source: "js-fallback-route-loop-budget" }, fallback);
    }

    const loopKind = String(readValueCaseInsensitive(packet, ["routeLoopKind", "RouteLoopKind", "loopKind", "LoopKind"]) || fallback.loopKind || "none");
    const routeAbortHint = String(readValueCaseInsensitive(packet, ["routeAbortHint", "RouteAbortHint"]) || fallback.routeAbortHint || "none");
    const exceededValue = readValueCaseInsensitive(packet, ["routeLoopBudgetExceeded", "RouteLoopBudgetExceeded", "exceeded", "Exceeded"]);
    return {
      source: "csharp-route-loop-budget",
      routeMode: String(readValueCaseInsensitive(packet, ["routeMode", "RouteMode"]) || fallback.routeMode || "spawn-approach"),
      loopKind,
      routeAbortHint,
      exceeded: exceededValue === undefined ? Boolean(fallback.exceeded) : Boolean(exceededValue),
      pivotUsed: routeMetric(packet, "routePivotUsed", "RoutePivotUsed", fallback.pivotUsed),
      pivotBudget: routeMetric(packet, "routePivotBudget", "RoutePivotBudget", fallback.pivotBudget),
      pivotExceeded: routeFlag(packet, "routePivotExceeded", "RoutePivotExceeded", fallback.pivotExceeded),
      slideUsed: routeMetric(packet, "routeSlideUsed", "RouteSlideUsed", fallback.slideUsed),
      slideBudget: routeMetric(packet, "routeSlideBudget", "RouteSlideBudget", fallback.slideBudget),
      slideExceeded: routeFlag(packet, "routeSlideExceeded", "RouteSlideExceeded", fallback.slideExceeded),
      backoffUsed: routeMetric(packet, "routeBackoffUsed", "RouteBackoffUsed", fallback.backoffUsed),
      backoffBudget: routeMetric(packet, "routeBackoffBudget", "RouteBackoffBudget", fallback.backoffBudget),
      backoffExceeded: routeFlag(packet, "routeBackoffExceeded", "RouteBackoffExceeded", fallback.backoffExceeded),
      advanceUsed: routeMetric(packet, "routeAdvanceUsed", "RouteAdvanceUsed", fallback.advanceUsed),
      advanceBudget: routeMetric(packet, "routeAdvanceBudget", "RouteAdvanceBudget", fallback.advanceBudget),
      advanceExceeded: routeFlag(packet, "routeAdvanceExceeded", "RouteAdvanceExceeded", fallback.advanceExceeded),
      ingressUsed: routeMetric(packet, "routeIngressUsed", "RouteIngressUsed", fallback.ingressUsed),
      ingressBudget: routeMetric(packet, "routeIngressBudget", "RouteIngressBudget", fallback.ingressBudget),
      ingressExceeded: routeFlag(packet, "routeIngressExceeded", "RouteIngressExceeded", fallback.ingressExceeded),
      recoverUsed: routeMetric(packet, "routeRecoverUsed", "RouteRecoverUsed", fallback.recoverUsed),
      recoverBudget: routeMetric(packet, "routeRecoverBudget", "RouteRecoverBudget", fallback.recoverBudget),
      recoverExceeded: routeFlag(packet, "routeRecoverExceeded", "RouteRecoverExceeded", fallback.recoverExceeded),
      topologyUsed: routeMetric(packet, "routeTopologyUsed", "RouteTopologyUsed", fallback.topologyUsed),
      topologyBudget: routeMetric(packet, "routeTopologyBudget", "RouteTopologyBudget", fallback.topologyBudget),
      topologyExceeded: routeFlag(packet, "routeTopologyExceeded", "RouteTopologyExceeded", fallback.topologyExceeded),
      arcUsed: routeMetric(packet, "routeArcUsed", "RouteArcUsed", fallback.arcUsed),
      arcBudget: routeMetric(packet, "routeArcBudget", "RouteArcBudget", fallback.arcBudget),
      arcExceeded: routeFlag(packet, "routeArcExceeded", "RouteArcExceeded", fallback.arcExceeded)
    };
  }

  function wallVector(state) {
    const value = Number(state?.wallVector);
    if (Number.isFinite(value) && Math.abs(value) <= 1) {
      return value;
    }

    const regions = Array.isArray(state?.screen6Regions) ? state.screen6Regions : [];
    if (regions.length < 6) {
      return 0;
    }

    const left = number(regions[0]) + number(regions[1]) + number(regions[2]) * 1.3;
    const right = number(regions[3]) + number(regions[4]) + number(regions[5]) * 1.3;
    return Math.max(-1, Math.min(1, right - left));
  }

  function turnYaw(turn, degrees) {
    return turn === "right" ? degrees : (turn === "left" ? -degrees : 0);
  }

  function turnAlignedYaw(turn, yaw, degrees) {
    const magnitude = Math.max(1, Math.abs(number(yaw, 0)) || Math.abs(number(degrees, 0)));
    if (turn === "right") {
      return magnitude;
    }

    if (turn === "left") {
      return -magnitude;
    }

    return number(yaw, 0);
  }

  function determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, currentRoute, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore) {
    if (doorOpenedCount > 0) {
      return "post-door";
    }

    if (spawnSecretDoorScore >= 0.70
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.24
      && spawnGapScore < 0.22
      && spawnLandmarkRouteEvidence < 0.40) {
      return "spawn-approach";
    }

    if (spawnSecretDoorScore >= 0.42
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.24
      && (previousRouteMode !== "door-approach"
        || (spawnGapScore < 0.28 && spawnLandmarkRouteEvidence < 0.36))) {
      return "spawn-approach";
    }

    if (useProbeScore >= 0.22 || firstDoorVisionScore >= 0.38 || (firstDoorRouteEvidenceReady && currentRoute === "first-door-route")) {
      return "door-approach";
    }

    if (previousRouteMode === "door-approach"
      && (useProbeScore >= 0.12
        || firstDoorVisionScore >= 0.24
        || firstDoorRouteEvidenceReady
        || spawnGapScore >= 0.24
        || spawnLandmarkRouteEvidence >= 0.36)) {
      return "door-approach";
    }

    return "spawn-approach";
  }

  function resolvePhaseCurrentRoute(routeMode, currentRoute, signals = {}) {
    if (routeMode !== "post-door") {
      return currentRoute;
    }

    if (signals.centralHallEntered) {
      return "central-hall-route";
    }

    if (signals.bridgeLaneVisible || signals.bridgeConfidence >= 0.18) {
      return "cross-bridge-route";
    }

    if (signals.computerRoomEntered
      || signals.computerRoomConfidence >= 0.18
      || signals.postDoorTerminalSurface >= 0.24) {
      return "computer-room-route";
    }

    return "post-door-corridor-route";
  }

  function createContext(profile, state) {
    const parameters = profile?.parameters || {};
    const depthEstimate = Math.max(0, Math.min(1.5, number(state?.depthEstimate ?? state?.depth ?? state?.depthSig, 1)));
    const depthSig = depthEstimate;
    const wall = wallVector(state);
    const qDelta = Math.max(-180, Math.min(180, Math.round(number(state?.qDelta, wall * 30))));
    const combatFaceThreshold = number(readParameter(parameters, "combatFaceThreshold"), 0.35);
    const doorAimToleranceDegrees = number(readParameter(parameters, "doorAimToleranceDegrees"), 10);
    const doorSoftAimToleranceDegrees = number(readParameter(parameters, "doorSoftAimToleranceDegrees"), 24);
    const doorAimYawDegrees = number(readParameter(parameters, "doorAimYawDegrees"), 8);
    const openCruiseYawDegrees = number(readParameter(parameters, "openCruiseYawDegrees"), 7);
    const spawnGapYawDegrees = number(readParameter(parameters, "spawnCorridorGapYawDegrees"), Math.max(12, openCruiseYawDegrees));
    const spawnGapThreshold = number(readParameter(parameters, "spawnCorridorGapThreshold"), 0.34);
    const openCruiseDeadZone = number(readParameter(parameters, "openCruiseWallVectorDeadZone"), 0.08);
    const context = String(state?.contextDict || "corridor").trim().toLowerCase();
    const spawnGapScore = number(state?.spawnCorridorGapScore, 0);
    const spawnGapTurn = state?.spawnCorridorGapTurn === "left" || state?.spawnCorridorGapTurn === "right"
      ? state.spawnCorridorGapTurn
      : "none";
    const spawnGapLockFrames = number(state?.spawnCorridorGapLockFrames, 0);
    const spawnLandmarkRouteEvidence = number(state?.spawnLandmarkRouteEvidence, 0);
    const spawnLandmarkRouteFrames = number(state?.spawnLandmarkRouteFrames, 0);
    const spawnLandmarkRouteTurn = state?.spawnLandmarkRouteTurn === "left" || state?.spawnLandmarkRouteTurn === "right"
      ? state.spawnLandmarkRouteTurn
      : "none";
    const spawnSecretDoorTurn = state?.spawnSecretDoorTurn === "left" || state?.spawnSecretDoorTurn === "right"
      ? state.spawnSecretDoorTurn
      : "none";
    const courtyardScore = number(state?.courtyardScore, 0);
    const spawnSecretDoorScore = number(state?.spawnSecretDoorScore, 0);
    const spawnWestStairScore = number(state?.spawnWestStairScore, 0);
    const eastWindowRecoverAnchor = courtyardScore >= 0.30
      && spawnSecretDoorScore < 0.62
      && (spawnGapScore < 0.24 || spawnSecretDoorScore >= 0.40);
    const firstDoorUseTurn = state?.firstDoorUseTurn === "left" || state?.firstDoorUseTurn === "right"
      ? state.firstDoorUseTurn
      : "none";
    const firstDoorVisionTurn = state?.firstDoorVision9x9Turn === "left" || state?.firstDoorVision9x9Turn === "right"
      ? state.firstDoorVision9x9Turn
      : "none";
    const bridgeBrownScore = number(state?.bridgeBrownScore, 0);
    const bridgeGreenLeft = number(state?.bridgeGreenLeft, 0);
    const bridgeGreenCenter = number(state?.bridgeGreenCenter, 0);
    const bridgeGreenRight = number(state?.bridgeGreenRight, 0);
    const bridgeGreenHazard = Math.max(bridgeGreenLeft, bridgeGreenCenter, bridgeGreenRight);
    const bridgeConfidence = Math.max(bridgeBrownScore, bridgeGreenHazard, number(state?.bridgeConfidence, 0));
    const bridgeLaneVisible = Boolean(state?.bridgeLaneVisible)
      || bridgeBrownScore >= 0.28
      || bridgeGreenHazard >= 0.18;
    const bridgeDoorScore = number(state?.bridgeDoorScore, 0);
    const bridgeLaneTurn = state?.bridgeLaneTurn === "left" || state?.bridgeLaneTurn === "right"
      ? state.bridgeLaneTurn
      : "none";
    const aimYaw = Math.abs(qDelta) > doorSoftAimToleranceDegrees
      ? Math.max(-24, Math.min(24, qDelta))
      : wall > 0 ? doorAimYawDegrees : -doorAimYawDegrees;

    const health = number(state?.healthSensor?.value ?? state?.healthSensor?.health ?? state?.health, 100);
    const faceSig = number(state?.faceSig, 0);
    const absFaceSig = Math.abs(faceSig);
    const audioEnemyConfidence = number(state?.audioEnemyConfidence, 0);
    const audioEnemyDirection = state?.audioEnemyDirection === "left" || state?.audioEnemyDirection === "right" || state?.audioEnemyDirection === "front"
      ? state.audioEnemyDirection
      : "none";
    const rawEnemyConfidence = number(state?.enemyConfidence, 0);
    const rawVisualEnemyConfidence = number(state?.visualEnemyConfidence, rawEnemyConfidence);
    const firstDoorVisionRedScore = number(state?.firstDoorVision9x9RedScore, 0);
    const computerPanelScore = number(state?.computerPanelScore ?? state?.milestones?.computerPanelScore, 0);
    const computerDarkPanelScore = number(state?.computerDarkPanelScore ?? state?.milestones?.computerDarkPanelScore, 0);
    const computerRoomScore = number(state?.computerRoomScore ?? state?.milestones?.computerRoomScore, 0);
    const statePostDoorTerminalSurface = number(state?.postDoorTerminalSurface ?? state?.milestones?.postDoorTerminalSurface, 0);
    const terminalSurface = Math.max(
      statePostDoorTerminalSurface,
      computerPanelScore,
      computerDarkPanelScore,
      computerRoomScore * 0.72);
    const terminalPanelSurface = Math.max(
      statePostDoorTerminalSurface,
      computerPanelScore,
      computerDarkPanelScore,
      computerRoomScore);
    const weakTerminalSurfaceEnemy = terminalSurface >= 0.24
      && rawVisualEnemyConfidence <= 0.32
      && audioEnemyConfidence < 0.18;
    const terminalOnlyVisualEnemy = terminalSurface >= 0.24
      && terminalPanelSurface >= 0.24
      && rawVisualEnemyConfidence >= 0.46
      && audioEnemyConfidence < 0.18
      && firstDoorVisionRedScore <= 0.08;
    const visualEnemySuppressed = Boolean(state?.visualEnemySuppressed)
      || (terminalSurface >= 0.24
        && rawVisualEnemyConfidence <= 0.46
        && (weakTerminalSurfaceEnemy
          || (audioEnemyConfidence >= 0.24 && audioEnemyDirection !== "front")))
      || terminalOnlyVisualEnemy;
    const visualEnemyConfidence = visualEnemySuppressed
      ? Math.min(rawVisualEnemyConfidence, 0.10)
      : rawVisualEnemyConfidence;
    const enemyConfidence = Math.max(visualEnemyConfidence, audioEnemyConfidence);
    const combatYawDegrees = Math.abs(number(readParameter(parameters, "combatYawDegrees"), 12));
    const audioCombatYawDegrees = Math.max(12, combatYawDegrees * 1.5);
    const audioCombatYaw = audioEnemyDirection === "left"
      ? -audioCombatYawDegrees
      : (audioEnemyDirection === "right" ? audioCombatYawDegrees : 0);
    const visualEnemyVisible = visualEnemyConfidence >= 0.28 || (!visualEnemySuppressed && absFaceSig >= combatFaceThreshold);
    const visualEnemyCentered = visualEnemyConfidence >= 0.28 && absFaceSig <= Math.max(0.10, combatFaceThreshold * 0.5);
    const visualEnemyYaw = visualEnemyCentered
      ? 0
      : Math.max(-18, Math.min(18, faceSig * Math.max(24, combatYawDegrees * 2)));
    const visualEnemyFireReady = visualEnemyCentered && visualEnemyConfidence >= 0.36;
    const lowHealthThreshold = Math.max(1, Math.min(100, Math.round(number(readParameter(parameters, "lowHealthThreshold"), 50))));
    const criticalHealthThreshold = Math.max(1, Math.min(lowHealthThreshold, Math.round(number(readParameter(parameters, "criticalHealthThreshold"), 18))));
    const lowHealthGoalFirst = health > 0 && health < lowHealthThreshold;
    const criticalHealth = health > 0 && health < criticalHealthThreshold;
    const lethalRisk = number(state?.lethalRisk, health <= 0 ? 1 : Math.max(0, Math.min(1, (lowHealthThreshold - health) / lowHealthThreshold)));
    const secretEscapeYawDegrees = Math.abs(number(readParameter(parameters, "spawnSecretDoorEscapeYawDegrees"), 34));
    const spawnSecretDoorEscapeYaw = spawnSecretDoorTurn === "right"
      ? -secretEscapeYawDegrees
      : secretEscapeYawDegrees;
    const firstDoorUseYaw = turnYaw(firstDoorUseTurn, doorAimYawDegrees);
    const firstDoorVisionYaw = turnYaw(firstDoorVisionTurn, Math.max(doorAimYawDegrees, 12));
    const footObstacleScore = number(state?.footObstacleScore, 0);
    const footObstacleFlickerScore = number(state?.footObstacleFlickerScore, 0);
    const footObstacleBounceFrames = number(state?.footObstacleBounceFrames, 0);
    const motionObstacleScore = number(state?.motionObstacleScore, 0);
    const motionForwardProgress = number(state?.motionForwardProgress, 0);
    const actionRepeatFrames = number(state?.kinesisActionRepeatFrames ?? state?.actionRepeatFrames ?? state?.repeatActionFrames, 0);
    const moveRepeatFrames = number(state?.kinesisMoveRepeatFrames ?? state?.moveRepeatFrames, 0);
    const turnRepeatFrames = number(state?.kinesisTurnRepeatFrames ?? state?.turnRepeatFrames ?? state?.repeatTurnFrames, 0);
    const predictions = number(state?.predictions, 0);
    const usePulseCooldown = Math.max(0, number(state?.usePulseCooldown ?? state?.autoplayUsePulseCooldown ?? state?.useCooldown, 0));
    const usePulseSuppressedFrames = Math.max(0, number(state?.usePulseSuppressedFrames, 0));
    const lastUsePulsePrediction = Math.max(-1, Math.floor(number(state?.lastUsePulsePrediction, -1)));
    const usePulseAgeFrames = lastUsePulsePrediction >= 0 && predictions >= lastUsePulsePrediction
      ? Math.max(0, Math.floor(predictions - lastUsePulsePrediction))
      : 9999;
    const doorOpenedCount = Math.max(
      number(state?.doorOpenedCount, 0),
      number(state?.milestones?.doorOpened, 0),
      number(state?.milestones?.doorOpenedCount, 0),
      number(state?.autoplayState?.doorOpenedCount, 0));
    const postDoorTerminalSurface = doorOpenedCount > 0 ? terminalSurface : 0;
    const postDoorAudioCue = Boolean(state?.postDoorAudioCue);
    const computerRoomEntered = Boolean(state?.computerRoomEntered);
    const centralHallEntered = Boolean(state?.centralHallEntered);
    const computerRoomCombatContext = state?.contextDict === "computer-room"
      || computerRoomEntered
      || number(state?.computerRoomConfidence, 0) >= 0.28;
    const centralHallFrames = number(state?.centralHallFrames, 0);
    const stairsEntered = Boolean(state?.stairsEntered);
    const enemyDefeatedCount = number(state?.enemyDefeatedCount, 0);
    const ammoLikelyEmpty = Boolean(state?.ammoLikelyEmpty);
    const finalRoomEntered = Boolean(state?.finalRoomEntered);
    const finalRoomCandidateFrames = number(state?.finalRoomCandidateFrames, 0);
    const exitSwitchUseFrames = number(state?.exitSwitchUseFrames, 0);
    const exitSwitchPressed = Boolean(state?.exitSwitchPressed);
    const centralHallConfidence = number(state?.centralHallConfidence, 0);
    const finalRoomConfidence = number(state?.finalRoomConfidence, 0);
    const centralHallBypassAllowed = centralHallEntered && (lowHealthGoalFirst || ammoLikelyEmpty || enemyDefeatedCount > 0);
    const finalRoomRouteCandidate = stairsEntered || doorOpenedCount > 1 || finalRoomConfidence >= 0.45;
    const computerRoomConfidence = number(state?.computerRoomConfidence, 0);
    const useProbeScore = number(state?.firstDoorUse3x3Score, 0);
    const firstDoorVisionScore = number(state?.firstDoorVision9x9Score, 0);
    const useProbeAlignment = Math.max(0, 1 - (Math.abs(qDelta) / Math.max(1, doorSoftAimToleranceDegrees)));
    const gapVector = (spawnGapTurn === "right" ? 1 : (spawnGapTurn === "left" ? -1 : 0)) * Math.min(1, Math.max(spawnGapScore, spawnGapLockFrames > 0 ? 0.38 : 0));
    const corridorVector = (spawnLandmarkRouteTurn === "right" ? 1 : (spawnLandmarkRouteTurn === "left" ? -1 : 0)) * Math.min(1, spawnLandmarkRouteEvidence);
    const wallFlowVector = number(state?.wallPatternVectorX ?? state?.wallFlowVector ?? wall, wall);
    const routePlan = requireRoutePlanner("evaluateRoutePlan")({
      depthSig,
      context,
      footObstacleScore,
      footObstacleFlickerScore,
      footObstacleBounceFrames,
      motionObstacleScore,
      motionForwardProgress,
      spawnCorridorGapScore: spawnGapScore,
      spawnLandmarkRouteEvidence,
      spawnSecretDoorScore,
      spawnWestStairScore,
      bridgeDoorScore,
      firstDoorVisionScore,
      firstDoorVisionRedScore,
      wallVector: wall,
      gapVector,
      corridorVector,
      wallFlowVector,
      useProbeScore,
      useProbeAlignment
    });
    const navigator = requireRoutePlanner("evaluateLandmarkNavigator")({
      routePlan,
      spawnCorridorGapTurn: spawnGapTurn,
      spawnLandmarkRouteTurn,
      wallVector: wall,
      spawnGapYawDegrees,
      wallAwayYawDegrees: number(readParameter(parameters, "wallAwayYawDegrees"), 6)
    });
    const openSpaceFootNoise = Boolean(routePlan.openSpaceFootNoise);
    const routeFootSoftClear = Boolean(routePlan.routeFootSoftClear);
    const routeTextureWallOcclusion = Boolean(routePlan.routeTextureWallOcclusion);
    const routeFootObstacle = Boolean(routePlan.routeFootObstacle);
    const routeFootClearRequired = Boolean(routePlan.routeFootClearRequired);
    const routeDepthClose = Boolean(routePlan.routeDepthClose);
    const routeCloseObstacle = Boolean(routePlan.routeCloseObstacle);
    const routeWallObstacle = Boolean(routePlan.routeWallObstacle);
    const routeWallObstaclePriorityAllowed = Boolean(routePlan.routeWallObstaclePriorityAllowed);
    const spawnInitialHardFootClear = context === "wall"
      || depthSig < 0.72
      || routeTextureWallOcclusion;
    const routeOpenSpaceLowGapScan = Boolean(routePlan.routeOpenSpaceLowGapScan);
    const routeOpenSpaceLowGapEscape = Boolean(routePlan.routeOpenSpaceLowGapEscape);
    const currentRouteRaw = routePlan.currentRoute || "open-space-cruise";
    const spawnSecretRouteEscapeGuard = routeFootObstacle
      || (spawnGapTurn === "none"
        && spawnLandmarkRouteEvidence >= 0.40
        && footObstacleScore >= 0.55
        && motionObstacleScore >= 0.55);
    const firstDoorRouteEvidence = number(routePlan.firstDoorRouteEvidence, 0);
    const firstDoorRouteEvidenceReady = Boolean(routePlan.firstDoorRouteEvidenceReady);
    const eastWindowRouteEvidenceReady = Boolean(routePlan.eastWindowRouteEvidenceReady);
    const previousRouteMode = state?.previousRouteMode || state?.routeMode || state?.autoplayState?.routeMode || "none";
    const routeMode = determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, currentRouteRaw, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore);
    const currentRoute = resolvePhaseCurrentRoute(routeMode, currentRouteRaw, {
      centralHallEntered,
      bridgeLaneVisible,
      bridgeConfidence,
      computerRoomEntered,
      computerRoomConfidence,
      postDoorTerminalSurface
    });
    const routePlannerAdvanceReady = routeMode === "post-door"
      || currentRoute === "first-door-route"
      || currentRoute === "spawn-west-stair-route-recover"
      || currentRoute === "spawn-landmark-route"
      || currentRoute === "open-space-cruise";
    const doorApproachRouteEvidenceStable = previousRouteMode === "door-approach"
      && routeMode === "door-approach"
      && (spawnGapScore >= 0.30 || spawnLandmarkRouteEvidence >= 0.40);
    const weakRearLandmarkResetAllowed = !doorApproachRouteEvidenceStable
      && (routeMode !== "door-approach"
        || depthSig < 0.32
        || spawnGapScore < 0.28);
    const previousRouteCorridorBridgeLockFrames = Math.max(0, number(
      state?.routeCorridorBridgeLockFrames
        ?? state?.previousRouteCorridorBridgeLockFrames
        ?? state?.autoplayState?.routeCorridorBridgeLockFrames
        ?? state?.debugRouteValues?.routeCorridorBridgeLockFrames,
      0));
    const routeCorridorBridgePostDoorSignal = routeMode === "post-door"
      && doorOpenedCount > 0
      && !centralHallEntered
      && !visualEnemyVisible
      && postDoorTerminalSurface >= 0.24
      && bridgeDoorScore >= 0.20
      && spawnGapScore >= 0.24
      && spawnLandmarkRouteEvidence >= 0.32
      && depthSig > 0.45
      && computerPanelScore < 0.55
      && computerDarkPanelScore < 0.55;
    const routeCorridorBridgeLockSignal = Boolean(routePlan.routeCorridorBridgeLock)
      || routeCorridorBridgePostDoorSignal;
    const routeCorridorBridgePreDoorStickyAllowed = routeMode === "door-approach"
      && doorOpenedCount <= 0
      && previousRouteCorridorBridgeLockFrames > 0
      && spawnGapScore >= 0.30
      && spawnLandmarkRouteEvidence >= 0.42
      && bridgeDoorScore >= 0.20
      && courtyardScore < 0.30
      && spawnSecretDoorScore < 0.80
      && useProbeScore < 0.22
      && !routeTextureWallOcclusion
      && !Boolean(routePlan.routeDeadEndRisk);
    const routeCorridorBridgePostDoorStickyAllowed = routeMode === "post-door"
      && doorOpenedCount > 0
      && previousRouteCorridorBridgeLockFrames > 0
      && !centralHallEntered
      && !visualEnemyVisible
      && postDoorTerminalSurface >= 0.24
      && bridgeDoorScore >= 0.08
      && spawnGapScore >= 0.18
      && spawnLandmarkRouteEvidence >= 0.24
      && depthSig > 0.42
      && computerPanelScore < 0.58
      && computerDarkPanelScore < 0.58;
    const routeCorridorBridgeStickyAllowed = routeCorridorBridgePreDoorStickyAllowed
      || routeCorridorBridgePostDoorStickyAllowed;
    const routeCorridorBridgeLockFrames = routeCorridorBridgeLockSignal
      ? Math.min(42, Math.max(previousRouteCorridorBridgeLockFrames + 1, 18))
      : (routeCorridorBridgeStickyAllowed ? Math.max(0, previousRouteCorridorBridgeLockFrames - 1) : 0);
    const routeCorridorBridgeLock = routeCorridorBridgeLockSignal || routeCorridorBridgeLockFrames > 0;
    const previousRoutePostDoorBridgeDoorMemoryFrames = Math.max(0, number(
      state?.routePostDoorBridgeDoorMemoryFrames
        ?? state?.previousRoutePostDoorBridgeDoorMemoryFrames
        ?? state?.autoplayState?.routePostDoorBridgeDoorMemoryFrames
        ?? state?.debugRouteValues?.routePostDoorBridgeDoorMemoryFrames,
      0));
    const routePostDoorBridgeDoorMemorySignal = routeMode === "post-door"
      && doorOpenedCount > 0
      && !centralHallEntered
      && !visualEnemyVisible
      && postDoorTerminalSurface >= 0.30
      && bridgeDoorScore >= 0.28
      && spawnGapScore >= 0.25
      && spawnLandmarkRouteEvidence >= 0.36
      && depthSig > 0.45;
    const routePostDoorBridgeDoorMemoryStickyAllowed = routeMode === "post-door"
      && doorOpenedCount > 0
      && previousRoutePostDoorBridgeDoorMemoryFrames > 0
      && !centralHallEntered
      && !visualEnemyVisible
      && postDoorTerminalSurface >= 0.24
      && depthSig > 0.42
      && (bridgeDoorScore >= 0.06 || spawnGapScore >= 0.20 || spawnLandmarkRouteEvidence >= 0.30);
    const routePostDoorBridgeDoorMemoryFrames = routePostDoorBridgeDoorMemorySignal
      ? Math.min(54, Math.max(previousRoutePostDoorBridgeDoorMemoryFrames + 1, 24))
      : (routePostDoorBridgeDoorMemoryStickyAllowed ? Math.max(0, previousRoutePostDoorBridgeDoorMemoryFrames - 1) : 0);
    const routePostDoorBridgeDoorMemory = routePostDoorBridgeDoorMemorySignal || routePostDoorBridgeDoorMemoryFrames > 0;
    const computedRouteLoopBudget = requireRouteLoopBudget("evaluate")({
      routeMode,
      actionRepeatFrames,
      moveRepeatFrames,
      turnRepeatFrames,
      motionForwardProgress,
      motionObstacleScore,
      footObstacleScore,
      spawnCorridorGapScore: spawnGapScore,
      spawnLandmarkRouteEvidence,
      predictions,
      firstDoorVisionScore,
      useProbeScore,
      routeDeadEndRisk: Boolean(routePlan.routeDeadEndRisk),
      eastWindowRecoverAnchor,
      eastWindowRouteEvidenceReady
    });
    const routeLoopBudget = canonicalRouteLoopBudget(state, computedRouteLoopBudget);
    const spawnGapYaw = number(navigator.spawnCorridorGapYaw, 0);
    const landmarkRouteYaw = number(navigator.landmarkRouteYaw, 0);
    const wallAwayYaw = number(navigator.wallAwayYaw, 0);
    const routeRecommendedYaw = number(navigator.recommendedYaw, 0) || number(routePlan.recommendedYaw, 0);
    const routeFallbackYaw = routeRecommendedYaw || number(navigator.routeFallbackYaw, 0);
    const visibleSpawnGapYaw = spawnGapScore >= 0.16
      ? turnYaw(spawnGapTurn, Math.max(6, spawnGapYawDegrees))
      : 0;
    const doorIngressYaw = visibleSpawnGapYaw
      || turnAlignedYaw(spawnGapTurn, spawnGapYaw, spawnGapYawDegrees)
      || turnAlignedYaw(spawnLandmarkRouteTurn, landmarkRouteYaw, spawnGapYawDegrees)
      || routeFallbackYaw;
    const routeWallPivotSourceYaw = spawnGapYaw || routeFallbackYaw || wallAwayYaw;
    const routeWallPivotDegrees = Math.abs(number(readParameter(parameters, "spawnCorridorWallPivotYawDegrees"), 18));
    const routeWallPivotYaw = routeWallPivotSourceYaw < 0 ? -routeWallPivotDegrees : routeWallPivotDegrees;
    const wallFaceScanDegrees = Math.abs(number(readParameter(parameters, "spawnWallFaceScanYawDegrees"), 28));
    const wallFaceScanSourceYaw = routeFallbackYaw || spawnGapYaw || wallAwayYaw;
    const spawnWallFaceScanYaw = wallFaceScanSourceYaw < 0 ? -wallFaceScanDegrees : wallFaceScanDegrees;
    const spawnCorridorSustainAllowed = spawnGapScore >= 0.24
      || depthSig <= 0.10
      || context === "wall";
    const routeTopologyWallDistanceNormalized = number(routePlan.routeTopologyWallDistanceNormalized, 1);
    const routeTopologyBarrelZoneEvidence = number(routePlan.routeTopologyBarrelZoneEvidence, 0);
    const routeTopologyCenterCorridorAlignment = number(routePlan.routeTopologyCenterCorridorAlignment, 0);
    const computedRoutePostDoorTerminalDeadEndScore = doorOpenedCount > 0
      && routeMode === "post-door"
      && postDoorTerminalSurface >= 0.30
      && routeTopologyBarrelZoneEvidence >= 0.92
      && routeTopologyCenterCorridorAlignment <= -0.30
      ? 1
      : 0;
    const routePostDoorTerminalDeadEndScore = Math.max(
      computedRoutePostDoorTerminalDeadEndScore,
      number(state?.routePostDoorTerminalDeadEndScore, 0));

    return {
      profile,
      parameters,
      state,
      depthSig,
      depthEstimate,
      wallVector: wall,
      qDelta,
      context,
      values: {
        true: true,
        false: false,
        health,
        hp: health,
        lowHealth: lowHealthGoalFirst,
        criticalHealth,
        lowHealthGoalFirst,
        lowHealthThreshold,
        criticalHealthThreshold,
        lethalRisk,
        depthSig,
        depthEstimate,
        faceSig,
        absFaceSig,
        soundEvent: Boolean(state?.soundEvent),
        postDoorAudioCue,
        computerRoomEntered,
        centralHallEntered,
        centralHallFrames,
        stairsEntered,
        enemyDefeatedCount,
        ammoLikelyEmpty,
        finalRoomEntered,
        finalRoomCandidateFrames,
        exitSwitchUseFrames,
        exitSwitchPressed,
        centralHallConfidence,
        finalRoomConfidence,
        centralHallBypassAllowed,
        finalRoomRouteCandidate,
        enemyConfidence,
        visualEnemyConfidence,
        visualEnemySuppressed,
        audioEnemyConfidence,
        audioEnemyDirection,
        audioEnemyLeft: audioEnemyDirection === "left",
        audioEnemyRight: audioEnemyDirection === "right",
        audioEnemyFront: audioEnemyDirection === "front",
        audioEnemySide: audioEnemyDirection === "left" || audioEnemyDirection === "right",
        audioEnemyStrong: audioEnemyConfidence >= 0.24,
        computerRoomCombatContext,
        visualEnemyVisible,
        visualEnemyCentered,
        visualEnemyFireReady,
        visualEnemyYaw,
        stuckTicks: number(state?.stuckTicks, 0),
        doorOpenedCount,
        computerRoomConfidence,
        computerRoomScore,
        computerPanelScore,
        computerDarkPanelScore,
        postDoorTerminalSurface,
        qDelta,
        absQDelta: Math.abs(qDelta),
        recoveryFrames: number(state?.recoveryFrames, 0),
        predictions,
        wallVector: wall,
        absWallVector: Math.abs(wall),
        context,
        motionForwardProgress,
        motionObstacleScore,
        motionTurnScore: number(state?.motionTurnScore, 0),
        actionRepeatFrames,
        moveRepeatFrames,
        turnRepeatFrames,
        usePulseCooldown,
        usePulseSuppressedFrames,
        lastUsePulsePrediction,
        usePulseAgeFrames,
        footObstacleScore,
        footObstacleFlickerScore,
        footObstacleBounceFrames,
        openSpaceFootNoise,
        routeFootSoftClear,
        routeTextureWallOcclusion,
        routeFootObstacle,
        routeFootClearRequired,
        routeDepthClose,
        routeCloseObstacle,
        routeWallObstacle,
        routeWallObstaclePriorityAllowed,
        spawnInitialHardFootClear,
        routeOpenSpaceLowGapScan,
        routeOpenSpaceLowGapEscape,
        routeBarrelLaneRisk: Boolean(routePlan.routeBarrelLaneRisk),
        routeBarrelLaneDetourRequired: Boolean(routePlan.routeBarrelLaneDetourRequired),
        routeTopologyWallDistanceNormalized,
        routeTopologyBarrelZoneEvidence,
        routeTopologyCenterCorridorAlignment,
        routePostDoorTerminalDeadEndScore,
        routeDeadEndRisk: Boolean(routePlan.routeDeadEndRisk),
        routeDeadEndTrimRequired: Boolean(routePlan.routeDeadEndTrimRequired),
        routeCorridorBridgeEvidence: number(routePlan.routeCorridorBridgeEvidence, 0),
        routeCorridorBridgeLockSignal,
        routeCorridorBridgeLock,
        routeCorridorBridgeLockFrames,
        routePostDoorBridgeDoorMemorySignal,
        routePostDoorBridgeDoorMemory,
        routePostDoorBridgeDoorMemoryFrames,
        doorApproachRouteEvidenceStable,
        weakRearLandmarkResetAllowed,
        currentRoute,
        previousRouteMode,
        routeMode,
        routeLoopKind: routeLoopBudget.loopKind,
        routeAbortHint: routeLoopBudget.routeAbortHint,
        routeLoopBudgetSource: routeLoopBudget.source,
        routeLoopBudgetExceeded: routeLoopBudget.exceeded,
        routePivotUsed: routeLoopBudget.pivotUsed,
        routePivotBudget: routeLoopBudget.pivotBudget,
        routePivotExceeded: routeLoopBudget.pivotExceeded,
        routeSlideUsed: routeLoopBudget.slideUsed,
        routeSlideBudget: routeLoopBudget.slideBudget,
        routeSlideExceeded: routeLoopBudget.slideExceeded,
        routeBackoffUsed: routeLoopBudget.backoffUsed,
        routeBackoffBudget: routeLoopBudget.backoffBudget,
        routeBackoffExceeded: routeLoopBudget.backoffExceeded,
        routeAdvanceUsed: routeLoopBudget.advanceUsed,
        routeAdvanceBudget: routeLoopBudget.advanceBudget,
        routeAdvanceExceeded: routeLoopBudget.advanceExceeded,
        routeIngressUsed: routeLoopBudget.ingressUsed,
        routeIngressBudget: routeLoopBudget.ingressBudget,
        routeIngressExceeded: routeLoopBudget.ingressExceeded,
        routeRecoverUsed: routeLoopBudget.recoverUsed,
        routeRecoverBudget: routeLoopBudget.recoverBudget,
        routeRecoverExceeded: routeLoopBudget.recoverExceeded,
        routeTopologyUsed: routeLoopBudget.topologyUsed,
        routeTopologyBudget: routeLoopBudget.topologyBudget,
        routeTopologyExceeded: routeLoopBudget.topologyExceeded,
        routeArcUsed: routeLoopBudget.arcUsed,
        routeArcBudget: routeLoopBudget.arcBudget,
        routeArcExceeded: routeLoopBudget.arcExceeded,
        currentLandmark: routePlan.currentLandmark || "none",
        routeActionHint: routePlan.routeActionHint || "cruise",
        routePlannerAdvanceReady,
        routeConfidence: number(routePlan.routeConfidence, 0),
        recommendedYaw: routeRecommendedYaw,
        useProbeConfidence: number(routePlan.useProbeConfidence, 0),
        gapVector,
        corridorVector,
        wallFlowVector,
        spawnCorridorGapScore: spawnGapScore,
        spawnCorridorSustainAllowed,
        spawnCorridorGapTurn: spawnGapTurn,
        spawnCorridorGapTurnNone: spawnGapTurn === "none",
        spawnCorridorGapLockFrames: spawnGapLockFrames,
        spawnLandmarkRouteEvidence,
        spawnLandmarkRouteFrames,
        spawnLandmarkRouteTurn,
        spawnLandmarkRouteYaw: landmarkRouteYaw,
        firstDoorVision9x9Score: firstDoorVisionScore,
        firstDoorVision9x9Turn: firstDoorVisionTurn,
        firstDoorVisionYaw,
        firstDoorVision9x9RedScore: firstDoorVisionRedScore,
        firstDoorVision9x9Heatmap: Array.isArray(state?.milestones?.firstDoorVision9x9Heatmap)
          ? state.milestones.firstDoorVision9x9Heatmap
          : (Array.isArray(state?.firstDoorVision9x9Heatmap) ? state.firstDoorVision9x9Heatmap : []),
        firstDoorVision9x9Box: state?.milestones?.firstDoorVision9x9Box || state?.firstDoorVision9x9Box || null,
        vision9x9Signature: state?.vision9x9Signature || state?.visionSensor?.signature || "",
        firstDoorUse3x3Score: useProbeScore,
        bridgeBrownScore,
        bridgeGreenLeft,
        bridgeGreenCenter,
        bridgeGreenRight,
        bridgeGreenHazard,
        bridgeConfidence,
        bridgeLaneVisible,
        bridgeDoorScore,
        firstDoorRouteEvidence,
        firstDoorRouteEvidenceReady,
        eastWindowRouteEvidenceReady,
        bridgeLaneTurn,
        spawnDoorPatternFrames: number(state?.spawnDoorPatternFrames, 0),
        spawnSecretDoorScore,
        spawnSecretDoorTurn,
        spawnSecretDoorLocked: Boolean(state?.spawnSecretDoorLocked),
        spawnSecretDoorLockFrames: number(state?.spawnSecretDoorLockFrames, 0),
        spawnSecretDoorEscapeYaw,
        spawnSecretRouteEscapeGuard,
        blueFloorScore: number(state?.blueFloorScore, 0),
        courtyardScore,
        courtyardTurn: state?.courtyardTurn === "left" || state?.courtyardTurn === "right" ? state.courtyardTurn : "none",
        eastWindowRecoverAnchor,
        spawnWestStairScore,
        spawnWestStairTurn: state?.spawnWestStairTurn === "left" || state?.spawnWestStairTurn === "right" ? state.spawnWestStairTurn : "none",
        spawnCenterAnchorScore: number(state?.spawnCenterAnchorScore, 0),
        spawnCenterAnchorTurn: state?.spawnCenterAnchorTurn === "left" || state?.spawnCenterAnchorTurn === "right" ? state.spawnCenterAnchorTurn : "none",
        firstDoorUseTurn,
        firstDoorUseYaw,
        firstDoorApproachYaw: firstDoorUseYaw || firstDoorVisionYaw || routeRecommendedYaw || routeFallbackYaw,
        escapeYaw: wall > 0
          ? -number(readParameter(parameters, "emergencyEscapeYawDegrees"), 34)
          : number(readParameter(parameters, "emergencyEscapeYawDegrees"), 34),
        audioCombatYaw,
        enemyCombatYaw: visualEnemyVisible && !visualEnemyCentered
          ? visualEnemyYaw
          : (audioEnemyConfidence >= 0.24 && audioEnemyDirection !== "none"
          ? audioCombatYaw
          : (faceSig < -combatFaceThreshold ? -combatYawDegrees : combatYawDegrees)),
        combatYaw: faceSig < -combatFaceThreshold ? -combatYawDegrees : combatYawDegrees,
        wallAwayYaw,
        doorIngressYaw,
        routeFallbackYaw,
        routeWallPivotYaw,
        spawnWallFaceScanYaw,
        openCruiseYaw: landmarkRouteYaw || spawnGapYaw || routeRecommendedYaw || (Math.abs(wall) < openCruiseDeadZone ? 0 : (wall > 0 ? -openCruiseYawDegrees : openCruiseYawDegrees)),
        aimYaw,
        doorProbeYaw: Math.abs(qDelta) <= doorAimToleranceDegrees ? 0 : aimYaw
      }
    };
  }

  self.AIKernelDoomControlContext = Object.freeze({
    createContext,
    wallVector
  });
})();
