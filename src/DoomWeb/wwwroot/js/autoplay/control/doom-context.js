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

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function readParameter(parameters, name) {
    return requireExpressionDsl("readParameter")(parameters, name);
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

  function determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, currentRoute, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore) {
    if (doorOpenedCount > 0) {
      return "post-door";
    }

    if (spawnSecretDoorScore >= 0.42
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.24) {
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

  function routeLoopBudgets(routeMode) {
    if (routeMode === "door-approach") {
      return { pivot: 8, slide: 6, backoff: 4 };
    }

    if (routeMode === "post-door") {
      return { pivot: 10, slide: 8, backoff: 4 };
    }

    return { pivot: 12, slide: 10, backoff: 5 };
  }

  function createRouteLoopBudget(routeMode, input) {
    const budgets = routeLoopBudgets(routeMode);
    const turnRepeatFrames = number(input?.turnRepeatFrames, 0);
    const actionRepeatFrames = number(input?.actionRepeatFrames, 0);
    const moveRepeatFrames = number(input?.moveRepeatFrames, 0);
    const motionForwardProgress = number(input?.motionForwardProgress, 0);
    const footObstacleScore = number(input?.footObstacleScore, 0);
    const motionObstacleScore = number(input?.motionObstacleScore, 0);
    const spawnCorridorGapScore = number(input?.spawnCorridorGapScore, 0);
    const spawnLandmarkRouteEvidence = number(input?.spawnLandmarkRouteEvidence, 0);
    const turnStall = turnRepeatFrames >= 6
      && motionForwardProgress < 0.10
      && spawnCorridorGapScore < 0.25
      && spawnLandmarkRouteEvidence < 0.45;
    const slideStall = actionRepeatFrames >= 8
      && motionForwardProgress < 0.18
      && footObstacleScore >= 0.55
      && motionObstacleScore >= 0.55
      && spawnCorridorGapScore < 0.25;
    const cornerStall = actionRepeatFrames >= 4
      && motionForwardProgress < 0.10
      && footObstacleScore >= 0.55
      && spawnCorridorGapScore < 0.25;
    const pivotUsed = turnStall ? turnRepeatFrames : 0;
    const slideUsed = slideStall ? actionRepeatFrames : 0;
    const backoffUsed = cornerStall ? Math.max(moveRepeatFrames, actionRepeatFrames) : 0;
    const pivotExceeded = pivotUsed >= budgets.pivot;
    const slideExceeded = slideUsed >= budgets.slide;
    const backoffExceeded = backoffUsed >= budgets.backoff;
    const exceeded = pivotExceeded || slideExceeded || backoffExceeded;
    const loopKind = pivotExceeded
      ? "turn-stall"
      : (slideExceeded ? "slide-stall" : (backoffExceeded ? "corner-stall" : "none"));
    const routeAbortHint = exceeded ? loopKind : "none";

    return {
      routeMode,
      loopKind,
      routeAbortHint,
      exceeded,
      pivotUsed,
      pivotBudget: budgets.pivot,
      pivotExceeded,
      slideUsed,
      slideBudget: budgets.slide,
      slideExceeded,
      backoffUsed,
      backoffBudget: budgets.backoff,
      backoffExceeded
    };
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
    const bridgeDoorScore = number(state?.bridgeDoorScore, 0);
    const bridgeLaneTurn = state?.bridgeLaneTurn === "left" || state?.bridgeLaneTurn === "right"
      ? state.bridgeLaneTurn
      : "none";
    const aimYaw = Math.abs(qDelta) > doorSoftAimToleranceDegrees
      ? Math.max(-24, Math.min(24, qDelta))
      : wall > 0 ? doorAimYawDegrees : -doorAimYawDegrees;

    const health = number(state?.health, 100);
    const lethalRisk = number(state?.lethalRisk, health <= 0 ? 1 : Math.max(0, Math.min(1, (10 - health) / 10)));
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
    const actionRepeatFrames = number(state?.actionRepeatFrames ?? state?.kinesisActionRepeatFrames ?? state?.repeatActionFrames, 0);
    const moveRepeatFrames = number(state?.moveRepeatFrames ?? state?.kinesisMoveRepeatFrames, 0);
    const turnRepeatFrames = number(state?.turnRepeatFrames ?? state?.kinesisTurnRepeatFrames ?? state?.repeatTurnFrames, 0);
    const predictions = number(state?.predictions, 0);
    const doorOpenedCount = number(state?.doorOpenedCount, 0);
    const useProbeScore = number(state?.firstDoorUse3x3Score, 0);
    const firstDoorVisionScore = number(state?.firstDoorVision9x9Score, 0);
    const firstDoorVisionRedScore = number(state?.firstDoorVision9x9RedScore, 0);
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
    const routeOpenSpaceLowGapScan = Boolean(routePlan.routeOpenSpaceLowGapScan);
    const routeOpenSpaceLowGapEscape = Boolean(routePlan.routeOpenSpaceLowGapEscape);
    const currentRoute = routePlan.currentRoute || "open-space-cruise";
    const routePlannerAdvanceReady = currentRoute === "first-door-route"
      || currentRoute === "spawn-west-stair-route-recover"
      || currentRoute === "spawn-landmark-route"
      || currentRoute === "open-space-cruise";
    const spawnSecretRouteEscapeGuard = routeFootObstacle
      || (spawnGapTurn === "none"
        && spawnLandmarkRouteEvidence >= 0.40
        && footObstacleScore >= 0.55
        && motionObstacleScore >= 0.55);
    const firstDoorRouteEvidence = number(routePlan.firstDoorRouteEvidence, 0);
    const firstDoorRouteEvidenceReady = Boolean(routePlan.firstDoorRouteEvidenceReady);
    const eastWindowRouteEvidenceReady = Boolean(routePlan.eastWindowRouteEvidenceReady);
    const previousRouteMode = state?.previousRouteMode || state?.routeMode || state?.autoplayState?.routeMode || "none";
    const routeMode = determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, currentRoute, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore);
    const routeLoopBudget = createRouteLoopBudget(routeMode, {
      actionRepeatFrames,
      moveRepeatFrames,
      turnRepeatFrames,
      motionForwardProgress,
      motionObstacleScore,
      footObstacleScore,
      spawnCorridorGapScore: spawnGapScore,
      spawnLandmarkRouteEvidence,
      useProbeScore
    });
    const spawnGapYaw = number(navigator.spawnCorridorGapYaw, 0);
    const landmarkRouteYaw = number(navigator.landmarkRouteYaw, 0);
    const wallAwayYaw = number(navigator.wallAwayYaw, 0);
    const routeRecommendedYaw = number(navigator.recommendedYaw, 0) || number(routePlan.recommendedYaw, 0);
    const routeFallbackYaw = routeRecommendedYaw || number(navigator.routeFallbackYaw, 0);
    const routeWallPivotSourceYaw = spawnGapYaw || routeFallbackYaw || wallAwayYaw;
    const routeWallPivotDegrees = Math.abs(number(readParameter(parameters, "spawnCorridorWallPivotYawDegrees"), 18));
    const routeWallPivotYaw = routeWallPivotSourceYaw < 0 ? -routeWallPivotDegrees : routeWallPivotDegrees;
    const wallFaceScanDegrees = Math.abs(number(readParameter(parameters, "spawnWallFaceScanYawDegrees"), 28));
    const wallFaceScanSourceYaw = routeFallbackYaw || spawnGapYaw || wallAwayYaw;
    const spawnWallFaceScanYaw = wallFaceScanSourceYaw < 0 ? -wallFaceScanDegrees : wallFaceScanDegrees;
    const spawnCorridorSustainAllowed = spawnGapScore >= 0.24
      || depthSig <= 0.10
      || context === "wall";

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
        lethalRisk,
        depthSig,
        depthEstimate,
        faceSig: number(state?.faceSig, 0),
        absFaceSig: Math.abs(number(state?.faceSig, 0)),
        soundEvent: Boolean(state?.soundEvent),
        stuckTicks: number(state?.stuckTicks, 0),
        doorOpenedCount,
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
        routeOpenSpaceLowGapScan,
        routeOpenSpaceLowGapEscape,
        currentRoute,
        routeMode,
        routeLoopKind: routeLoopBudget.loopKind,
        routeAbortHint: routeLoopBudget.routeAbortHint,
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
        firstDoorUse3x3Score: useProbeScore,
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
        combatYaw: number(state?.faceSig, 0) < -combatFaceThreshold
          ? -number(readParameter(parameters, "combatYawDegrees"), 12)
          : number(readParameter(parameters, "combatYawDegrees"), 12),
        wallAwayYaw,
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
