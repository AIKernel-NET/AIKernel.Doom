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

  function canonicalDoorOpenedCount(...sources) {
    let sawCount = false;
    let countValue = 0;
    let legacyValue = 0;
    sources.forEach(source => {
      if (!source || typeof source !== "object") {
        return;
      }
      const count = readValueCaseInsensitive(source, ["doorOpenedCount", "DoorOpenedCount"]);
      if (count !== undefined) {
        sawCount = true;
        countValue = Math.max(countValue, number(count, 0));
        return;
      }
      const legacy = readValueCaseInsensitive(source, ["doorOpened", "DoorOpened"]);
      if (legacy !== undefined) {
        legacyValue = Math.max(legacyValue, number(legacy, 0));
      }
    });
    return Math.max(0, sawCount ? countValue : legacyValue);
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

  function readStateValue(state, autoplayState, milestones, names) {
    const sources = [state, autoplayState, milestones];
    for (let index = 0; index < sources.length; index += 1) {
      const value = readValueCaseInsensitive(sources[index], names);
      if (value !== undefined) {
        return value;
      }
    }

    return undefined;
  }

  function faceHealthPercentFromLevel(level, phase) {
    const normalizedPhase = String(phase || "").trim().toLowerCase();
    if (normalizedPhase === "dead" || normalizedPhase === "death" || normalizedPhase === "dead-fixed") {
      return 0;
    }
    if (normalizedPhase === "invulnerable" || normalizedPhase === "god" || normalizedPhase === "iddqd") {
      return 100;
    }

    const parsed = Math.round(number(level, NaN));
    if (!Number.isFinite(parsed)) {
      return NaN;
    }

    if (parsed >= 5) {
      return 100;
    }
    if (parsed === 4) {
      return 75;
    }
    if (parsed === 3) {
      return 55;
    }
    if (parsed === 2) {
      return 30;
    }
    if (parsed === 1) {
      return 12;
    }
    return NaN;
  }

  function meaningfulFaceValue(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value === undefined || value === null) {
        continue;
      }
      const text = String(value).trim().toLowerCase();
      if (text && text !== "unknown" && text !== "none") {
        return value;
      }
    }
    return undefined;
  }

  function isDefinitiveFacePhase(phase) {
    const normalized = String(phase || "").trim().toLowerCase();
    return normalized === "dead"
      || normalized === "death"
      || normalized === "dead-fixed"
      || normalized === "invulnerable"
      || normalized === "god"
      || normalized === "iddqd";
  }

  function resolveHealthPercent(fallback, ...sources) {
    let numericHealth = NaN;
    let faceHealth = NaN;
    let faceConfidence = 0;
    let faceAuthoritative = false;

    sources.forEach(source => {
      if (!source || typeof source !== "object") {
        return;
      }

      const numeric = number(
        source.health
          ?? source.hp
          ?? source.value
          ?? source.estimatedPercent
          ?? source.healthEstimatedPercent,
        NaN);
      if (Number.isFinite(numeric) && !Number.isFinite(numericHealth)) {
        numericHealth = Math.max(0, Math.min(100, numeric));
      }

      const stablePhase = meaningfulFaceValue(
        source.faceLifeTemplatePhase,
        source.healthFaceLifeTemplatePhase,
        source.faceLifePhase,
        source.healthFaceLifePhase);
      const stableLevel = meaningfulFaceValue(
        source.faceLifeTemplateLevel,
        source.healthFaceLifeTemplateLevel,
        source.faceLifeLevel,
        source.healthFaceLifeLevel);
      let candidate = faceHealthPercentFromLevel(stableLevel, stablePhase);
      if (!Number.isFinite(candidate)) {
        const quantizedPhase = meaningfulFaceValue(
          source.faceLifeQuantizedPhase,
          source.healthFaceLifeQuantizedPhase);
        const quantizedLevel = meaningfulFaceValue(
          source.faceLifeQuantizedLevel,
          source.healthFaceLifeQuantizedLevel);
        const quantizedCandidate = faceHealthPercentFromLevel(quantizedLevel, quantizedPhase);
        const quantizedConfidence = Math.max(0, Math.min(1, number(
          source.faceLifeQuantizedConfidence
            ?? source.healthFaceLifeQuantizedConfidence
            ?? source.faceTemplateConfidence
            ?? source.healthFaceTemplateConfidence,
          0)));
        if (Number.isFinite(quantizedCandidate)
            && (isDefinitiveFacePhase(quantizedPhase) || quantizedConfidence >= 0.92)) {
          candidate = quantizedCandidate;
        }
      }
      if (!Number.isFinite(candidate) && Number.isFinite(numeric) && numeric > 0 && numeric <= 5) {
        const phaseHint = meaningfulFaceValue(
          stablePhase,
          source.faceLifePattern,
          source.healthFaceLifePattern);
        if (phaseHint !== undefined || source.faceHeartbeatAlive === true || source.faceSignatureValid === true) {
          candidate = faceHealthPercentFromLevel(numeric, phaseHint);
        }
      }
      const confidence = Math.max(0, Math.min(1, number(
        source.faceLifeTemplateConfidence
          ?? source.healthFaceLifeTemplateConfidence
          ?? source.faceTemplateConfidence
          ?? source.healthFaceTemplateConfidence
          ?? source.faceLifeConfidence
          ?? source.healthFaceLifeConfidence,
        0)));
      if (Number.isFinite(candidate) && confidence >= faceConfidence) {
        faceHealth = candidate;
        faceConfidence = confidence;
        faceAuthoritative = faceAuthoritative
          || Boolean(source.faceLifeTemplateAuthoritative)
          || Boolean(source.healthFaceLifeTemplateAuthoritative);
      }
    });

    const faceTrusted = Number.isFinite(faceHealth)
      && (faceAuthoritative || !Number.isFinite(numericHealth) || numericHealth <= 0);
    const numericLooksLikeFaceLevel = Number.isFinite(faceHealth)
      && Number.isFinite(numericHealth)
      && numericHealth > 0
      && numericHealth <= 5;
    if (faceTrusted || numericLooksLikeFaceLevel) {
      return faceHealth;
    }
    if (Number.isFinite(numericHealth)) {
      return numericHealth;
    }
    return Math.max(0, Math.min(100, number(fallback, 100)));
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

  function determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, firstDoorPhaseReady, currentRoute, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore, firstDoorContactMemoryReady = false) {
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

    if (!firstDoorPhaseReady) {
      return "spawn-approach";
    }

    if (useProbeScore >= 0.22 || firstDoorVisionScore >= 0.38 || (firstDoorRouteEvidenceReady && currentRoute === "first-door-route")) {
      return "door-approach";
    }

    if (previousRouteMode === "door-approach"
      && (useProbeScore >= 0.12
        || firstDoorVisionScore >= 0.24
        || firstDoorRouteEvidenceReady
        || firstDoorContactMemoryReady
        || spawnGapScore >= 0.24
        || spawnLandmarkRouteEvidence >= 0.36)) {
      return "door-approach";
    }

    return "spawn-approach";
  }

  function sanitizePreviousRouteMode(doorOpenedCount, previousRouteMode) {
    const mode = String(previousRouteMode || "none").trim().toLowerCase();
    if (doorOpenedCount <= 0 && mode === "post-door") {
      return "none";
    }

    return mode || "none";
  }

  function resolvePhaseCurrentRoute(routeMode, currentRoute, signals = {}) {
    if (routeMode !== "post-door") {
      return currentRoute;
    }

    if (signals.centralHallEntered) {
      return "central-hall-route";
    }

    if (number(signals.centralHallConfidence) >= 0.18) {
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

  function resolveDoorApproachCurrentRoute(routeMode, currentRoute, signals = {}) {
    if (routeMode !== "door-approach" || number(signals.doorOpenedCount) > 0) {
      return currentRoute;
    }

    if (currentRoute === "first-door-route") {
      return currentRoute;
    }

    const stickyFirstDoorApproach = signals.firstDoorPhaseReady
      || signals.firstDoorContactMemoryReady
      || number(signals.firstDoorVisionScore) >= 0.24
      || number(signals.bridgeDoorScore) >= 0.12
      || number(signals.spawnLandmarkRouteEvidence) >= 0.28
      || number(signals.spawnCorridorGapScore) >= 0.24;
    return stickyFirstDoorApproach ? "first-door-route" : currentRoute;
  }

  function resolvePhaseRouteHint(routeMode, currentRoute, routePlan = {}, signals = {}) {
    if (routeMode !== "post-door") {
      if (routeMode === "door-approach" && currentRoute === "first-door-route") {
        return {
          currentLandmark: "first-door-approach",
          routeActionHint: "advance-first-door"
        };
      }

      return {
        currentLandmark: routePlan.currentLandmark || "none",
        routeActionHint: routePlan.routeActionHint || "cruise"
      };
    }

    if (currentRoute === "first-door-route"
      && (
        signals.computerRoomEntered
        || number(signals.computerRoomConfidence) >= 0.18
        || number(signals.postDoorTerminalSurface) >= 0.24
        || signals.bridgeLaneVisible
        || number(signals.bridgeConfidence) >= 0.18
      )) {
      currentRoute = signals.bridgeLaneVisible || number(signals.bridgeConfidence) >= 0.18
        ? "cross-bridge-route"
        : "computer-room-route";
    }

    if (currentRoute === "central-hall-route"
      || signals.centralHallEntered
      || number(signals.centralHallConfidence) >= 0.18) {
      return {
        currentLandmark: "central-hall-door",
        routeActionHint: "advance-central-hall"
      };
    }

    if (currentRoute === "cross-bridge-route"
      || signals.bridgeLaneVisible
      || number(signals.bridgeConfidence) >= 0.18) {
      return {
        currentLandmark: "cross-bridge-lane",
        routeActionHint: "advance-cross-bridge"
      };
    }

    if (currentRoute === "computer-room-route"
      || signals.computerRoomEntered
      || number(signals.computerRoomConfidence) >= 0.18
      || number(signals.postDoorTerminalSurface) >= 0.24) {
      return {
        currentLandmark: "computer-room-egress",
        routeActionHint: "advance-computer-room"
      };
    }

    return {
      currentLandmark: "post-door-corridor",
      routeActionHint: "post-door-cruise"
    };
  }

  function createContext(profile, state) {
    const parameters = profile?.parameters || {};
    const autoplayState = readObjectCaseInsensitive(state, ["autoplayState", "AutoplayState"]) || {};
    const milestones = readObjectCaseInsensitive(autoplayState, ["milestones", "Milestones"])
      || readObjectCaseInsensitive(state, ["milestones", "Milestones"])
      || {};
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
    const spawnGapFrames = number(
      state?.spawnCorridorGapFrames
        ?? state?.milestones?.spawnCorridorGapFrames
        ?? autoplayState?.milestones?.spawnCorridorGapFrames,
      0);
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
    const postDoorDoorOpenedCount = Math.max(
      canonicalDoorOpenedCount(state),
      canonicalDoorOpenedCount(state?.milestones),
      canonicalDoorOpenedCount(state?.autoplayState),
      canonicalDoorOpenedCount(state?.autoplayState?.milestones));
    const bridgeGreenHazard = Math.max(bridgeGreenLeft, bridgeGreenCenter, bridgeGreenRight);
    const rawBridgeConfidence = Math.max(bridgeBrownScore, bridgeGreenHazard, number(state?.bridgeConfidence, 0));
    const bridgeConfidence = postDoorDoorOpenedCount > 0 ? rawBridgeConfidence : 0;
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

    const healthSensor = state?.healthSensor && typeof state.healthSensor === "object" ? state.healthSensor : {};
    const rawCriticalBloodAlive = Boolean(healthSensor.criticalBloodAlive ?? state?.criticalBloodAlive ?? state?.healthCriticalBloodAlive);
    const rawBloodDangerScore = Math.max(0, Math.min(1, number(
      healthSensor.bloodDangerScore ?? state?.bloodDangerScore ?? state?.healthBloodDangerScore,
      rawCriticalBloodAlive ? 0.58 : 0)));
    const rawHealthDangerReason = String(healthSensor.healthDangerReason || state?.healthDangerReason || (rawCriticalBloodAlive ? "face-heartbeat-blood" : "none"));
    const facePoseDiversity = number(healthSensor.facePoseDiversity ?? state?.facePoseDiversity ?? state?.healthFacePoseDiversity, 0);
    const faceFixedFrames = number(healthSensor.faceFixedFrames ?? state?.faceFixedFrames ?? state?.healthFaceFixedFrames, 0);
    const faceHeartbeatAlive = Boolean(
      healthSensor.faceHeartbeatAlive
      ?? healthSensor.healthFaceHeartbeatAlive
      ?? state?.faceHeartbeatAlive
      ?? state?.healthFaceHeartbeatAlive);
    const faceLifePattern = String(healthSensor.faceLifePattern || state?.faceLifePattern || state?.healthFaceLifePattern || "unknown");
    const faceLifePhase = String(healthSensor.faceLifePhase || state?.faceLifePhase || state?.healthFaceLifePhase || "unknown");
    const faceLifeLevel = Math.max(0, Math.min(5, Math.round(number(
      healthSensor.faceLifeLevel ?? state?.faceLifeLevel ?? state?.healthFaceLifeLevel,
      0))));
    const faceLifeQuantizedPhase = String(
      healthSensor.faceLifeQuantizedPhase
        || state?.faceLifeQuantizedPhase
        || state?.healthFaceLifeQuantizedPhase
        || faceLifePhase
        || "unknown");
    const faceLifeQuantizedLevel = Math.max(0, Math.min(5, Math.round(number(
      healthSensor.faceLifeQuantizedLevel
        ?? state?.faceLifeQuantizedLevel
        ?? state?.healthFaceLifeQuantizedLevel
        ?? faceLifeLevel,
      0))));
    const faceLifeTemplatePhase = String(
      healthSensor.faceLifeTemplatePhase
        || state?.faceLifeTemplatePhase
        || state?.healthFaceLifeTemplatePhase
        || faceLifePhase
        || faceLifeQuantizedPhase
        || "unknown");
    const faceLifeTemplateLevel = Math.max(0, Math.min(5, Math.round(number(
      healthSensor.faceLifeTemplateLevel
        ?? state?.faceLifeTemplateLevel
        ?? state?.healthFaceLifeTemplateLevel
        ?? faceLifeLevel
        ?? faceLifeQuantizedLevel,
      0))));
    const faceLifeTemplateConfidence = Math.max(0, Math.min(1, number(
      healthSensor.faceLifeTemplateConfidence
        ?? state?.faceLifeTemplateConfidence
        ?? state?.healthFaceLifeTemplateConfidence
        ?? healthSensor.faceTemplateConfidence
        ?? state?.faceTemplateConfidence,
      0)));
    const faceLifeTemplateAuthoritative = Boolean(
      healthSensor.faceLifeTemplateAuthoritative
        ?? state?.faceLifeTemplateAuthoritative
        ?? state?.healthFaceLifeTemplateAuthoritative);
    const explicitHealthSamples = [
      healthSensor.health,
      healthSensor.value,
      healthSensor.estimatedPercent,
      state?.health,
      state?.hp,
      state?.value,
      state?.estimatedPercent
    ]
      .map(value => number(value, NaN))
      .filter(value => Number.isFinite(value));
    const explicitHighNumericHealth = explicitHealthSamples
      .filter(value => value >= 50 && value <= 100)
      .reduce((best, value) => Math.max(best, value), NaN);
    const explicitNumericLowHealth = explicitHealthSamples
      .some(value => value > 5 && value < 50);
    const rawResolvedHealth = resolveHealthPercent(100, healthSensor, state);
    const faceOnlyLowHealthNoise = rawResolvedHealth > 0
      && rawResolvedHealth < 50
      && Number.isFinite(explicitHighNumericHealth)
      && !rawCriticalBloodAlive
      && !faceLifeTemplateAuthoritative
      && !Boolean(healthSensor.retryRequested ?? state?.healthRetryRequested)
      && !Boolean(healthSensor.likelyDead ?? state?.healthLikelyDead);
    const health = faceOnlyLowHealthNoise ? explicitHighNumericHealth : rawResolvedHealth;
    const lowHealthPressure = health > 0 && health < 50;
    const damagedHealthPressure = health > 0 && health < 65;
    const faceSig = number(state?.faceSig, 0);
    const absFaceSig = Math.abs(faceSig);
    const audioEnemyConfidence = number(state?.audioEnemyConfidence, 0);
    const audioEnemyDirection = state?.audioEnemyDirection === "left" || state?.audioEnemyDirection === "right" || state?.audioEnemyDirection === "front"
      ? state.audioEnemyDirection
      : "none";
    const rawEnemyConfidence = number(state?.enemyConfidence, 0);
    const rawVisualEnemyConfidence = number(state?.visualEnemyConfidence, rawEnemyConfidence);
    const enemyConfidencePeak = Math.max(
      number(state?.enemyConfidencePeak, 0),
      number(state?.milestones?.enemyConfidencePeak, 0),
      rawVisualEnemyConfidence);
    const healthDeathOrRetry = health <= 0
      || Boolean(healthSensor.retryRequested ?? state?.healthRetryRequested)
      || Boolean(healthSensor.likelyDead ?? state?.healthLikelyDead);
    const healthThreatEvidenceTrusted = healthDeathOrRetry
      || rawCriticalBloodAlive
      || Boolean(healthSensor.lowHealth ?? state?.lowHealth)
      || Boolean(healthSensor.healthSensorEnabled ?? state?.healthSensorEnabled)
      || Boolean(healthSensor.faceVitalEnabled ?? state?.faceVitalEnabled)
      || faceLifeTemplateAuthoritative
      || (faceHeartbeatAlive && faceLifeLevel > 0)
      || (facePoseDiversity >= 2 && faceLifeLevel > 0)
      || (explicitNumericLowHealth && !faceOnlyLowHealthNoise);
    const preDoorHealthDangerSuppressed = postDoorDoorOpenedCount <= 0 && !healthDeathOrRetry;
    const criticalBloodAlive = preDoorHealthDangerSuppressed ? false : rawCriticalBloodAlive;
    const bloodDangerScore = preDoorHealthDangerSuppressed ? 0 : rawBloodDangerScore;
    const healthDangerReason = preDoorHealthDangerSuppressed ? "pre-door-suppressed" : rawHealthDangerReason;
    const firstDoorVisionRedScore = number(state?.firstDoorVision9x9RedScore, 0);
    const computerPanelScore = number(state?.computerPanelScore ?? state?.milestones?.computerPanelScore, 0);
    const computerDarkPanelScore = number(state?.computerDarkPanelScore ?? state?.milestones?.computerDarkPanelScore, 0);
    const computerRoomScore = number(state?.computerRoomScore ?? state?.milestones?.computerRoomScore, 0);
    const rawComputerRoomConfidence = number(state?.computerRoomConfidence, 0);
    const computerRoomConfidence = postDoorDoorOpenedCount > 0 ? rawComputerRoomConfidence : 0;
    const statePostDoorTerminalSurface = postDoorDoorOpenedCount > 0
      ? number(state?.postDoorTerminalSurface ?? state?.milestones?.postDoorTerminalSurface, 0)
      : 0;
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
    const terminalVisualCombatDecoy = terminalSurface >= 0.24
      && rawVisualEnemyConfidence <= 0.46
      && audioEnemyConfidence < 0.34
      && firstDoorVisionRedScore <= 0.08;
    const enemyStructuralDecoy = Boolean(state?.enemyStructuralDecoy);
    const darkDamageCombatEvidence = postDoorDoorOpenedCount > 0
      && damagedHealthPressure
      && !enemyStructuralDecoy
      && terminalSurface >= 0.20
      && rawVisualEnemyConfidence >= (lowHealthPressure ? 0.24 : 0.30);
    const visualEnemySuppressed = (Boolean(state?.visualEnemySuppressed) && !darkDamageCombatEvidence)
      || enemyStructuralDecoy
      || (terminalVisualCombatDecoy && !darkDamageCombatEvidence)
      || (terminalSurface >= 0.24
        && rawVisualEnemyConfidence <= 0.46
        && !darkDamageCombatEvidence
        && (weakTerminalSurfaceEnemy
          || (audioEnemyConfidence >= 0.24 && audioEnemyDirection !== "front")))
      || (terminalOnlyVisualEnemy && !darkDamageCombatEvidence);
    const visualEnemyConfidence = visualEnemySuppressed
      ? Math.min(rawVisualEnemyConfidence, 0.10)
      : rawVisualEnemyConfidence;
    const enemyConfidence = Math.max(visualEnemyConfidence, audioEnemyConfidence);
    const combatYawDegrees = Math.abs(number(readParameter(parameters, "combatYawDegrees"), 12));
    const audioCombatYawDegrees = Math.max(8, combatYawDegrees * 0.75);
    const audioCombatYaw = audioEnemyDirection === "left"
      ? -audioCombatYawDegrees
      : (audioEnemyDirection === "right" ? audioCombatYawDegrees : 0);
    const sideAudioBias = audioEnemyConfidence >= 0.24 && (audioEnemyDirection === "left" || audioEnemyDirection === "right");
    const visualEnemyVisible = visualEnemyConfidence >= 0.28
      || (!visualEnemySuppressed && visualEnemyConfidence >= 0.18 && absFaceSig >= combatFaceThreshold);
    const visualCenterFaceWindow = Math.max(0.10, combatFaceThreshold * 0.5);
    const visualEnemyCentered = visualEnemyConfidence >= 0.28
      && !sideAudioBias
      && absFaceSig <= visualCenterFaceWindow;
    const visualEnemyYaw = visualEnemyCentered
      ? 0
      : (sideAudioBias && absFaceSig <= visualCenterFaceWindow
        ? audioCombatYaw
        : Math.max(-18, Math.min(18, faceSig * Math.max(24, combatYawDegrees * 2))));
    const visualEnemyFireReady = visualEnemyCentered && visualEnemyConfidence >= 0.36;
    const postDoorEnemyMemoryEvidence = postDoorDoorOpenedCount > 0
      && !enemyStructuralDecoy
      && !terminalVisualCombatDecoy
      && enemyConfidencePeak >= 0.62
      && rawVisualEnemyConfidence >= 0.08
      && terminalSurface >= 0.28;
    const stateTrustedEnemyThreat = terminalVisualCombatDecoy ? 0 : number(state?.trustedEnemyThreat, 0);
    const trustedEnemyThreat = Math.max(
      stateTrustedEnemyThreat,
      enemyStructuralDecoy ? 0 : (visualEnemyConfidence >= 0.52 && rawVisualEnemyConfidence >= 0.52 ? visualEnemyConfidence : 0),
      audioEnemyConfidence >= 0.34 ? audioEnemyConfidence : 0,
      postDoorEnemyMemoryEvidence ? Math.min(0.34, enemyConfidencePeak * 0.42) : 0,
      darkDamageCombatEvidence ? Math.min(0.46, rawVisualEnemyConfidence * 0.82) : 0);
    const trustedCombatEvidence = (!terminalVisualCombatDecoy && Boolean(state?.trustedCombatEvidence))
      || trustedEnemyThreat >= 0.26
      || postDoorEnemyMemoryEvidence
      || (!enemyStructuralDecoy && !terminalVisualCombatDecoy && visualEnemyFireReady)
      || (audioEnemyConfidence >= 0.34 && audioEnemyDirection !== "none")
      || darkDamageCombatEvidence;
    const lowHealthThreshold = Math.max(1, Math.min(100, Math.round(number(readParameter(parameters, "lowHealthThreshold"), 50))));
    const criticalHealthThreshold = Math.max(1, Math.min(lowHealthThreshold, Math.round(number(readParameter(parameters, "criticalHealthThreshold"), 18))));
    const survivalBloodDangerThreshold = Math.max(0.10, Math.min(1, number(readParameter(parameters, "survivalBloodDangerThreshold"), 0.52)));
    const aliveFacePattern = faceHeartbeatAlive
      || faceLifePattern === "alive-cycle"
      || faceLifePattern === "alive-damaged"
      || facePoseDiversity >= 2;
    const rawLowHealthGoalFirst = healthThreatEvidenceTrusted
      && ((health > 0 && health < lowHealthThreshold) || criticalBloodAlive);
    const rawCriticalHealth = healthThreatEvidenceTrusted && health > 0 && health < criticalHealthThreshold;
    const stateLethalRisk = number(state?.lethalRisk, NaN);
    const computedHealthRisk = health <= 0 ? 1 : Math.max(0, Math.min(1, (lowHealthThreshold - health) / lowHealthThreshold));
    const rawLethalRisk = Math.max(
      bloodDangerScore,
      healthThreatEvidenceTrusted && Number.isFinite(stateLethalRisk) ? stateLethalRisk : computedHealthRisk);
    const lowHealthGoalFirst = preDoorHealthDangerSuppressed ? false : rawLowHealthGoalFirst;
    const criticalHealth = preDoorHealthDangerSuppressed ? false : rawCriticalHealth;
    const lethalRisk = preDoorHealthDangerSuppressed ? 0 : rawLethalRisk;
    const survivalGoalFirst = !preDoorHealthDangerSuppressed && (lowHealthGoalFirst
      || (!Boolean(healthSensor.retryRequested ?? state?.healthRetryRequested)
        && !Boolean(healthSensor.likelyDead ?? state?.healthLikelyDead)
        && aliveFacePattern
        && bloodDangerScore >= survivalBloodDangerThreshold));
    const secretEscapeYawDegrees = Math.abs(number(readParameter(parameters, "spawnSecretDoorEscapeYawDegrees"), 34));
    const spawnSecretDoorEscapeYaw = spawnSecretDoorTurn === "right"
      ? -secretEscapeYawDegrees
      : secretEscapeYawDegrees;
    const explicitFirstDoorUseYaw = number(readStateValue(state, state?.autoplayState, state?.milestones, [
      "firstDoorUseYaw",
      "FirstDoorUseYaw"
    ]), NaN);
    const explicitFirstDoorVisionYaw = number(readStateValue(state, state?.autoplayState, state?.milestones, [
      "firstDoorVisionYaw",
      "FirstDoorVisionYaw",
      "firstDoorVision9x9Yaw",
      "FirstDoorVision9x9Yaw"
    ]), NaN);
    const firstDoorUseYaw = Number.isFinite(explicitFirstDoorUseYaw)
      ? explicitFirstDoorUseYaw
      : turnYaw(firstDoorUseTurn, doorAimYawDegrees);
    const firstDoorVisionYaw = Number.isFinite(explicitFirstDoorVisionYaw)
      ? explicitFirstDoorVisionYaw
      : turnYaw(firstDoorVisionTurn, Math.max(doorAimYawDegrees, 12));
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
    const centralHallEntered = Boolean(readStateValue(state, autoplayState, milestones, ["centralHallEntered", "CentralHallEntered"]));
    const postDoorCarryText = [
      state?.routeMode,
      state?.previousRouteMode,
      state?.currentRoute,
      state?.route,
      state?.objective,
      state?.currentObjective,
      state?.routeObjective,
      state?.controlPipeline,
      state?.stage,
      state?.semanticMemory?.phase,
      state?.semanticMemory?.objective,
      autoplayState?.routeMode,
      autoplayState?.currentRoute,
      autoplayState?.route,
      autoplayState?.objective,
      autoplayState?.controlPipeline
    ].join(" ").toLowerCase();
    const postDoorCarryEvidence = /\b(post-door|computer-room|central-hall|reach-central-hall|cross-bridge)\b/.test(postDoorCarryText)
      && Math.max(terminalSurface, computerRoomConfidence, computerRoomScore, computerPanelScore, computerDarkPanelScore, bridgeConfidence) >= 0.34;
    const postDoorComputerRoomCarryEvidence = /\b(computer-room|central-hall|reach-central-hall|cross-bridge)\b/.test(postDoorCarryText)
      && Math.max(terminalSurface, computerRoomConfidence, computerRoomScore, computerPanelScore, computerDarkPanelScore, bridgeConfidence) >= 0.28;
    const explicitClosedDoorReset = number(state?.doorOpenedCount, NaN) === 0
      && number(state?.milestones?.doorOpenedCount, NaN) === 0
      && number(autoplayState?.milestones?.doorOpenedCount, NaN) === 0;
    const liveClosedDoorCarryContradiction = explicitClosedDoorReset
      && number(state?.firstDoorVision9x9Score, 0) >= 0.36
      && number(state?.firstDoorUse3x3Score, 0) <= 0.08;
    const postDoorCarryDoorOpened = postDoorDoorOpenedCount <= 0
      && !centralHallEntered
      && postDoorCarryEvidence
      && !liveClosedDoorCarryContradiction;
    const doorOpenedCount = Math.max(postDoorDoorOpenedCount, postDoorCarryDoorOpened ? 1 : 0);
    const postDoorTerminalSurface = doorOpenedCount > 0 ? terminalSurface : 0;
    const postDoorAudioCue = doorOpenedCount > 0
      && Boolean(readStateValue(state, autoplayState, milestones, ["postDoorAudioCue", "PostDoorAudioCue"]));
    const computerRoomVisualEntry = doorOpenedCount > 0
      && centralHallEntered !== true
      && (computerRoomConfidence >= 0.70 || computerRoomScore >= 0.58)
      && (postDoorTerminalSurface >= 0.24 || computerPanelScore >= 0.42 || computerDarkPanelScore >= 0.42 || bridgeConfidence >= 0.54);
    const rawComputerRoomEntered = Boolean(readStateValue(state, autoplayState, milestones, ["computerRoomEntered", "ComputerRoomEntered"]));
    const computerRoomEntered = doorOpenedCount > 0
      && (rawComputerRoomEntered || computerRoomVisualEntry || (postDoorComputerRoomCarryEvidence && !liveClosedDoorCarryContradiction));
    const computerRoomCombatContext = doorOpenedCount > 0
      && (state?.contextDict === "computer-room"
        || computerRoomEntered
        || computerRoomConfidence >= 0.28);
    const centralHallFrames = number(readStateValue(state, autoplayState, milestones, ["centralHallFrames", "CentralHallFrames"]), 0);
    const stairsEntered = Boolean(readStateValue(state, autoplayState, milestones, ["stairsEntered", "StairsEntered"]));
    const enemyDefeatedCount = number(readStateValue(state, autoplayState, milestones, ["enemyDefeatedCount", "EnemyDefeatedCount", "enemyDefeated", "EnemyDefeated"]), 0);
    const combatFireFrames = number(readStateValue(state, autoplayState, milestones, ["combatFireFrames", "CombatFireFrames"]), 0);
    const centralHallCombatFireBudget = Math.max(3, Math.round(number(readParameter(parameters, "centralHallCombatFireBudget"), 14)));
    const combatRouteEngageAllowed = !centralHallEntered
      || enemyDefeatedCount > 0
      || combatFireFrames < centralHallCombatFireBudget
      || trustedEnemyThreat >= 0.62
      || audioEnemyConfidence >= 0.50;
    const combatBurstFrames = number(readStateValue(state, autoplayState, milestones, ["combatBurstFrames", "CombatBurstFrames"]), 0);
    const combatBurstShots = number(readStateValue(state, autoplayState, milestones, ["combatBurstShots", "CombatBurstShots"]), 0);
    const ammoLikelyEmpty = Boolean(readStateValue(state, autoplayState, milestones, ["ammoLikelyEmpty", "AmmoLikelyEmpty"]));
    const finalRoomEntered = Boolean(readStateValue(state, autoplayState, milestones, ["finalRoomEntered", "FinalRoomEntered"]));
    const finalRoomCandidateFrames = number(readStateValue(state, autoplayState, milestones, ["finalRoomCandidateFrames", "FinalRoomCandidateFrames"]), 0);
    const exitSwitchUseFrames = number(readStateValue(state, autoplayState, milestones, ["exitSwitchUseFrames", "ExitSwitchUseFrames"]), 0);
    const exitSwitchPressed = Boolean(readStateValue(state, autoplayState, milestones, ["exitSwitchPressed", "ExitSwitchPressed"]));
    const centralHallConfidence = number(readStateValue(state, autoplayState, milestones, ["centralHallConfidence", "CentralHallConfidence"]), 0);
    const finalRoomConfidence = number(readStateValue(state, autoplayState, milestones, ["finalRoomConfidence", "FinalRoomConfidence"]), 0);
    const centralHallBypassAllowed = centralHallEntered && (survivalGoalFirst || ammoLikelyEmpty || enemyDefeatedCount > 0);
    const finalRoomRouteCandidate = stairsEntered || doorOpenedCount > 1 || finalRoomConfidence >= 0.45;
    const useProbeScore = number(state?.firstDoorUse3x3Score, 0);
    const firstDoorVisionScore = number(state?.firstDoorVision9x9Score, 0);
    const firstDoorVisionBox = state?.milestones?.firstDoorVision9x9Box || state?.firstDoorVision9x9Box || null;
    const firstDoorVisionBoxKind = String(
      firstDoorVisionBox?.kind
        || firstDoorVisionBox?.label
        || firstDoorVisionBox?.id
        || "").toLowerCase();
    const firstDoorExplicitWallPatternDetected =
      /\bfirst-door.*wall-pattern\b|\bfirst-door-wall\b|\bdoor-wall-pattern\b/.test(firstDoorVisionBoxKind)
      || (Array.isArray(state?.activeDetections) && state.activeDetections.some(detection => {
        const text = [
          detection?.kind,
          detection?.label,
          detection?.name,
          detection?.id
        ].join(" ").toLowerCase();
        return text.indexOf("first-door-wall-pattern") >= 0
          || text.indexOf("first-door-wall") >= 0
          || text.indexOf("door-wall-pattern") >= 0;
      }));
    const firstDoorHeuristicWallPatternDetected = firstDoorVisionScore >= 0.30
        && firstDoorVisionRedScore <= 0.08
        && useProbeScore <= 0.04
        && bridgeDoorScore <= 0.14
        && terminalSurface <= 0.30
        && computerRoomConfidence <= 0.32
        && computerPanelScore <= 0.40
        && computerDarkPanelScore <= 0.30;
    const firstDoorWallPatternDetected = firstDoorExplicitWallPatternDetected
      || firstDoorHeuristicWallPatternDetected;
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
    const semanticMemory = state?.semanticMemory || state?.autoplayState?.semanticMemory || {};
    const semanticSymbols = semanticMemory?.symbols || {};
    const semanticRoutePlan = semanticMemory?.route || {};
    const semanticRouteText = String([
      semanticRoutePlan.currentRoute,
      semanticRoutePlan.route,
      semanticRoutePlan.objective,
      semanticRoutePlan.routeObjective
    ].join(" ")).toLowerCase();
    const semanticLandmarkText = String([
      semanticRoutePlan.currentLandmark,
      semanticRoutePlan.routeLandmark
    ].join(" ")).toLowerCase();
    const semanticHintText = String([
      semanticRoutePlan.routeActionHint,
      semanticRoutePlan.routeHint
    ].join(" ")).toLowerCase();
    const semanticCentralDoorRouteReady = doorOpenedCount > 0
      && !centralHallEntered
      && (
        semanticRouteText.indexOf("central-hall") >= 0
        || semanticLandmarkText.indexOf("central-hall-door") >= 0
        || semanticHintText.indexOf("central-door") >= 0
        || semanticHintText.indexOf("open-central-hall") >= 0
      )
      && Math.max(bridgeConfidence, number(semanticSymbols.bridge, 0)) >= 0.48
      && bridgeDoorScore >= 0.24
      && terminalSurface >= 0.28;
    const currentRouteRaw = semanticCentralDoorRouteReady
      ? "central-hall-route"
      : (routePlan.currentRoute || "open-space-cruise");
    const spawnSecretRouteEscapeGuard = routeFootObstacle
      || (spawnGapTurn === "none"
        && spawnLandmarkRouteEvidence >= 0.40
        && footObstacleScore >= 0.55
        && motionObstacleScore >= 0.55);
    const firstDoorRouteEvidence = number(routePlan.firstDoorRouteEvidence, 0);
    const firstDoorRouteEvidenceReady = Boolean(routePlan.firstDoorRouteEvidenceReady);
    const eastWindowRouteEvidenceReady = Boolean(routePlan.eastWindowRouteEvidenceReady);
    const previousRouteMode = sanitizePreviousRouteMode(
      doorOpenedCount,
      state?.previousRouteMode || state?.routeMode || state?.autoplayState?.routeMode || "none");
    const semanticDoor = number(semanticSymbols.door, 0);
    const semanticCorridor = number(semanticSymbols.corridor, 0);
    const firstDoorContactMemoryReady = previousRouteMode === "door-approach"
      && predictions >= 1800
      && useProbeScore < 0.12
      && firstDoorVisionRedScore < 0.06
      && bridgeDoorScore < 0.18
      && Math.max(footObstacleScore, motionObstacleScore) >= 0.58
      && motionForwardProgress >= 0
      && motionForwardProgress <= 0.30
      && semanticDoor >= 0.42
      && semanticCorridor >= 0.48;
    const firstDoorLeftPanelMemoryReady = previousRouteMode === "door-approach"
      && predictions >= 1440
      && useProbeScore < 0.12
      && firstDoorVisionRedScore < 0.06
      && firstDoorVisionScore < 0.24
      && bridgeDoorScore >= 0.20
      && courtyardScore >= 0.30
      && state?.courtyardTurn === "left"
      && Math.max(footObstacleScore, motionObstacleScore) >= 0.58
      && semanticDoor >= 0.48;
    const firstDoorWeakGapLoopMemoryReady = previousRouteMode === "door-approach"
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.12
      && firstDoorVisionRedScore < 0.04
      && bridgeDoorScore < 0.08
      && spawnGapScore >= 0.18
      && spawnGapScore < 0.28
      && spawnGapTurn === "right"
      && (predictions >= 5000 || turnRepeatFrames >= 160 || actionRepeatFrames >= 8)
      && Math.abs(wall) >= 0.50
      && Math.max(footObstacleScore, motionObstacleScore) >= 0.56
      && semanticDoor >= 0.45;
    const firstDoorLateAmbiguousMemoryReady = previousRouteMode === "door-approach"
      && predictions >= 3600
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.12
      && firstDoorVisionRedScore < 0.06
      && bridgeDoorScore < 0.08
      && spawnGapScore >= 0.18
      && spawnGapScore < 0.26
      && spawnGapTurn === "right"
      && spawnLandmarkRouteEvidence >= 0.30
      && Math.abs(wall) >= 0.45
      && Math.max(footObstacleScore, motionObstacleScore) >= 0.56
      && semanticDoor >= 0.48;
    const wallDepthOnlyWithoutDoorIdentity = context === "wall"
      && footObstacleScore < 0.20
      && motionObstacleScore < 0.20
      && useProbeScore < 0.12
      && firstDoorVisionScore < 0.24
      && bridgeDoorScore < 0.12;
    const previousDoorApproachStickyReady = previousRouteMode === "door-approach"
      && !wallDepthOnlyWithoutDoorIdentity
      && (spawnGapScore >= 0.18
        || spawnLandmarkRouteEvidence >= 0.36
        || firstDoorContactMemoryReady
        || firstDoorLeftPanelMemoryReady
        || firstDoorWeakGapLoopMemoryReady
        || firstDoorLateAmbiguousMemoryReady
        || firstDoorRouteEvidenceReady);
    const routeFootClearOnly = String(routePlan.routeActionHint || "").toLowerCase() === "clear-foot"
      && useProbeScore < 0.12
      && firstDoorVisionRedScore < 0.08
      && bridgeDoorScore < 0.18;
    const closeWallWithoutFootObstacle = context === "wall"
      && depthSig <= 0.10
      && footObstacleScore < 0.20
      && motionObstacleScore < 0.20;
    const firstDoorVisualIdentityReady = firstDoorVisionScore >= 0.38
      && (firstDoorVisionRedScore >= 0.04
        || (useProbeScore >= 0.08 && !closeWallWithoutFootObstacle)
        || bridgeDoorScore >= 0.08
        || firstDoorExplicitWallPatternDetected);
    const firstDoorWallPatternPhaseReady = firstDoorExplicitWallPatternDetected
      || (firstDoorWallPatternDetected && !routeFootClearOnly);
    const firstDoorCorridorPhaseReady = context === "corridor"
      && firstDoorRouteEvidenceReady
      && spawnLandmarkRouteEvidence >= 0.44
      && spawnGapScore >= 0.30
      && spawnSecretDoorScore < 0.42;
    const firstDoorPhaseReady = useProbeScore >= 0.22
      || firstDoorVisualIdentityReady
      || firstDoorWallPatternPhaseReady
      || firstDoorCorridorPhaseReady
      || previousDoorApproachStickyReady;
    const routeMode = determineRouteMode(doorOpenedCount, useProbeScore, firstDoorVisionScore, firstDoorRouteEvidenceReady, firstDoorPhaseReady, currentRouteRaw, previousRouteMode, spawnGapScore, spawnLandmarkRouteEvidence, spawnSecretDoorScore, firstDoorContactMemoryReady || firstDoorLeftPanelMemoryReady || firstDoorWeakGapLoopMemoryReady || firstDoorLateAmbiguousMemoryReady);
    const doorApproachRoute = resolveDoorApproachCurrentRoute(routeMode, currentRouteRaw, {
      doorOpenedCount,
      firstDoorPhaseReady,
      firstDoorContactMemoryReady,
      firstDoorVisionScore,
      bridgeDoorScore,
      spawnLandmarkRouteEvidence,
      spawnCorridorGapScore: spawnGapScore
    });
    const resolvedCurrentRoute = resolvePhaseCurrentRoute(routeMode, doorApproachRoute, {
      centralHallEntered,
      centralHallConfidence,
      bridgeLaneVisible,
      bridgeConfidence,
      bridgeDoorScore,
      computerRoomEntered,
      computerRoomConfidence,
      postDoorTerminalSurface
    });
    const currentRoute = semanticCentralDoorRouteReady
      ? "central-hall-route"
      : resolvedCurrentRoute;
    const phaseRouteHint = semanticCentralDoorRouteReady
      ? {
        currentLandmark: "central-hall-door",
        routeActionHint: "advance-central-hall"
      }
      : resolvePhaseRouteHint(routeMode, currentRoute, routePlan, {
      centralHallEntered,
      centralHallConfidence,
      bridgeLaneVisible,
      bridgeConfidence,
      bridgeDoorScore,
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
    const explicitRecommendedYaw = number(readStateValue(state, state?.autoplayState, state?.milestones, [
      "recommendedYaw",
      "RecommendedYaw",
      "routeRecommendedYaw",
      "RouteRecommendedYaw"
    ]), NaN);
    const explicitRouteFallbackYaw = number(readStateValue(state, state?.autoplayState, state?.milestones, [
      "routeFallbackYaw",
      "RouteFallbackYaw"
    ]), NaN);
    const routeRecommendedYaw = Number.isFinite(explicitRecommendedYaw)
      ? explicitRecommendedYaw
      : (number(navigator.recommendedYaw, 0) || number(routePlan.recommendedYaw, 0));
    const routeFallbackYaw = Number.isFinite(explicitRouteFallbackYaw)
      ? explicitRouteFallbackYaw
      : (routeRecommendedYaw || number(navigator.routeFallbackYaw, 0));
    const firstDoorUseAimReady = useProbeScore >= 0.22
      && (firstDoorUseTurn !== "none" || useProbeScore >= 0.34);
    const firstDoorVisionAimReady = firstDoorVisionScore >= 0.38
      && firstDoorVisionRedScore >= 0.05
      && (firstDoorVisionTurn !== "none" || firstDoorVisionBox);
    const explicitFirstDoorApproachYaw = number(readStateValue(state, state?.autoplayState, state?.milestones, [
      "firstDoorApproachYaw",
      "FirstDoorApproachYaw"
    ]), NaN);
    const firstDoorApproachYaw = Number.isFinite(explicitFirstDoorApproachYaw)
      ? explicitFirstDoorApproachYaw
      : (firstDoorUseAimReady
        ? firstDoorUseYaw
        : (firstDoorVisionAimReady ? firstDoorVisionYaw : (routeRecommendedYaw || routeFallbackYaw)));
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
        criticalBloodAlive,
        healthCriticalBloodAlive: criticalBloodAlive,
        bloodDangerScore,
        healthBloodDangerScore: bloodDangerScore,
        healthDangerReason,
        healthThreatEvidenceTrusted,
        preDoorHealthDangerSuppressed,
        healthDeathOrRetry,
        lowHealthGoalFirst,
        survivalGoalFirst,
        lowHealthThreshold,
        criticalHealthThreshold,
        survivalBloodDangerThreshold,
        facePoseDiversity,
        faceFixedFrames,
        faceHeartbeatAlive,
        faceLifePattern,
        faceLifePhase,
        faceLifeLevel,
        faceLifeQuantizedPhase,
        faceLifeQuantizedLevel,
        faceLifeTemplatePhase,
        faceLifeTemplateLevel,
        faceLifeTemplateConfidence,
        faceLifeTemplateAuthoritative,
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
        combatFireFrames,
        centralHallCombatFireBudget,
        combatRouteEngageAllowed,
        combatBurstFrames,
        combatBurstShots,
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
        enemyConfidencePeak,
        trustedEnemyThreat,
        trustedCombatEvidence,
        darkDamageCombatEvidence,
        postDoorEnemyMemoryEvidence,
        terminalVisualCombatDecoy,
        enemyStructuralDecoy,
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
        doorOpenedContradicted: Boolean(state?.doorOpenedContradicted),
        activeDetections: Array.isArray(state?.activeDetections)
          ? state.activeDetections
          : (Array.isArray(state?.detections) ? state.detections : []),
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
        semanticMemory,
        currentRoute,
        previousRouteMode,
        routeMode,
        openingResetProjectionActive: Boolean(state?.openingResetProjectionActive || state?.autoplayState?.openingResetProjectionActive),
        postRetryOpeningGuardFrames: number(
          state?.postRetryOpeningGuardFrames
            ?? state?.autoplayState?.postRetryOpeningGuardFrames,
          0),
        firstDoorContactMemoryReady,
        firstDoorLeftPanelMemoryReady,
        firstDoorWeakGapLoopMemoryReady,
        firstDoorLateAmbiguousMemoryReady,
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
        currentLandmark: phaseRouteHint.currentLandmark,
        routeActionHint: phaseRouteHint.routeActionHint,
        routePlannerAdvanceReady,
        routeConfidence: number(routePlan.routeConfidence, 0),
        recommendedYaw: routeRecommendedYaw,
        useProbeConfidence: number(routePlan.useProbeConfidence, 0),
        gapVector,
        corridorVector,
        wallFlowVector,
        spawnCorridorGapScore: spawnGapScore,
        spawnCorridorGapFrames: spawnGapFrames,
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
        firstDoorVision9x9Box: firstDoorVisionBox,
        firstDoorVision9x9BoxKind: firstDoorVisionBoxKind,
        firstDoorWallPatternDetected,
        firstDoorPhaseReady,
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
        firstDoorApproachYaw,
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
