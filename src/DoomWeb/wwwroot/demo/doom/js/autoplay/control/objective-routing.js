(function () {
  "use strict";

  const OBJECTIVE_ROUTING_ID = "doom-scoped-objective-routing-v1";
  const CANONICAL_OBJECTIVE_MAP = Object.freeze({
    "open-first-door": "open-door",
    "align-first-door": "align-first-door",
    "approach-first-door": "approach-first-door",
    "find-and-open-first-door": "approach-first-door",
    "enter-first-door-corridor": "enter-first-door-corridor",
    "locate-first-door-corridor": "locate-first-door-corridor",
    "find-corridor-to-first-door": "find-corridor-to-first-door",
    "follow-demo-route-to-first-door": "follow-demo-route-to-first-door",
    "recover-via-east-window": "recover-via-east-window",
    "cross-bridge": "reach-bridge",
    "reach-central-hall": "reach-central-hall",
    "engage-front-enemy": "engage-front-enemy",
    "secure-central-hall": "secure-central-hall",
    "bypass-gatekeeper": "reach-final-room",
    "reach-final-room": "reach-final-room",
    "press-exit-switch": "press-exit-switch",
    "level-clear": "level-clear",
    "enter-computer-control-room": "enter-computer-room",
    "restore-relative-motion": "stabilize-safe-zone",
    "retry-after-death": "stabilize-safe-zone"
  });

  const POST_FIRST_DOOR_OBJECTIVES = Object.freeze([
    "enter-computer-room",
    "reach-bridge",
    "reach-central-hall",
    "engage-front-enemy",
    "secure-central-hall",
    "reach-final-room",
    "press-exit-switch",
    "level-clear"
  ]);

  const PRE_FIRST_DOOR_CANONICAL_OBJECTIVES = Object.freeze([
    "open-door",
    "align-first-door",
    "approach-first-door",
    "enter-first-door-corridor",
    "locate-first-door-corridor",
    "find-corridor-to-first-door",
    "follow-demo-route-to-first-door",
    "recover-via-east-window"
  ]);

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function bool(value) {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }

    return false;
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

  function isRecoveryObjective(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "stabilize-safe-zone"
      || normalized === "restore-relative-motion"
      || normalized === "retry-after-death"
      || normalized === "low-health"
      || normalized === "low-health-escape";
  }

  function isStalePostDoorRequest(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "monitor"
      || normalized === "runtime-monitor"
      || normalized === "idle"
      || normalized === "openinghome"
      || normalized === "opening-home"
      || normalized === "firstdoor"
      || normalized === "first-door"
      || normalized === "open-door"
      || normalized === "open-first-door"
      || normalized === "align-first-door"
      || normalized === "approach-first-door"
      || normalized === "enter-first-door-corridor"
      || normalized === "locate-first-door-corridor"
      || normalized === "find-corridor-to-first-door"
      || normalized === "follow-demo-route-to-first-door"
      || normalized === "recover-via-east-window";
  }

  function sourceShowsRecoveredHealth(source, lowHealthThreshold) {
    if (!source || typeof source !== "object") {
      return false;
    }

    if (source.likelyDead === true
      || source.retryRequested === true
      || source.criticalBloodAlive === true) {
      return false;
    }

    const numericHealth = Math.max(
      number(source.health, NaN),
      number(source.hp, NaN),
      number(source.value, NaN),
      number(source.estimatedPercent, NaN),
      number(source.healthEstimatedPercent, NaN));
    const faceLevel = Math.max(
      number(source.faceLifeLevel, NaN),
      number(source.healthFaceLifeLevel, NaN),
      number(source.faceLifeTemplateLevel, NaN),
      number(source.healthFaceLifeTemplateLevel, NaN));
    const phase = [
      source.faceLifePhase,
      source.healthFaceLifePhase,
      source.faceLifeTemplatePhase,
      source.healthFaceLifeTemplatePhase,
      source.faceLifePattern,
      source.healthFaceLifePattern
    ].join(" ").toLowerCase();
    const aliveFace = faceLevel >= 3
      || /\b(healthy|wounded|damaged|alive-cycle|invulnerable|god|iddqd)\b/.test(phase);
    const threshold = Math.max(1, Math.min(100, number(lowHealthThreshold, 50)));
    return numericHealth >= threshold
      || (source.lowHealth === false && aliveFace)
      || (numericHealth >= 45 && aliveFace);
  }

  function currentLowHealth(signals, resolvedHealth, lowHealthThreshold) {
    const threshold = Math.max(1, Math.min(100, number(lowHealthThreshold, 50)));
    const healthSensor = signals?.healthSensor && typeof signals.healthSensor === "object"
      ? signals.healthSensor
      : null;
    const recovered = sourceShowsRecoveredHealth(healthSensor, threshold)
      || sourceShowsRecoveredHealth(signals, threshold);
    if (recovered) {
      return false;
    }

    if (healthSensor?.criticalBloodAlive === true
      || signals?.criticalBloodAlive === true
      || healthSensor?.retryRequested === true
      || signals?.healthRetryRequested === true) {
      return true;
    }

    if (healthSensor?.lowHealth === true || signals?.lowHealth === true) {
      return true;
    }

    return resolvedHealth > 0 && resolvedHealth < threshold;
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
          || bool(source.faceLifeTemplateAuthoritative)
          || bool(source.healthFaceLifeTemplateAuthoritative);
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

  function objectiveRoute(objective, means, reason, requested) {
    return {
      objective,
      purpose: objective,
      means,
      reason,
      requestedObjective: requested || "",
      routingId: OBJECTIVE_ROUTING_ID
    };
  }

  function goalFirstObjective(signals = {}) {
    if (bool(signals.exitSwitchPressed)) {
      return "level-clear";
    }

    if (bool(signals.finalRoomEntered) || number(signals.finalRoomConfidence) >= 0.72) {
      return "press-exit-switch";
    }

    if (bool(signals.centralHallEntered) || bool(signals.stairsEntered) || number(signals.doorOpenedCount) > 1) {
      return "reach-final-room";
    }

    if (bool(signals.computerRoomEntered) || number(signals.bridgeConfidence) >= 0.30) {
      return "reach-central-hall";
    }

    return "enter-computer-room";
  }

  function resolveObjectiveRoute(signals = {}) {
    const requested = String(signals?.semanticObjective || signals?.currentObjective || "").trim();
    const canonical = CANONICAL_OBJECTIVE_MAP[requested];
    const firstDoorOpened = bool(signals.firstDoorOpened);
    const structuralDecoy = bool(signals.enemyStructuralDecoy) || bool(signals.visualEnemySuppressed);
    const trustedCombatEvidence = bool(signals.trustedCombatEvidence)
      || bool(signals.postDoorEnemyMemoryEvidence)
      || number(signals.trustedEnemyThreat) >= 0.26
      || (!structuralDecoy && number(signals.visualEnemyConfidence) >= 0.35)
      || (!structuralDecoy && number(signals.enemyConfidence) >= 0.42)
      || number(signals.audioEnemyConfidence) >= 0.34;
    const actionableEnemy = !structuralDecoy && trustedCombatEvidence;
    const postDoorRouteText = [
      signals.currentRoute,
      signals.route,
      signals.routeMode,
      signals.currentObjective,
      signals.semanticObjective,
      signals.safetyReason,
      signals.stage
    ].join(" ").toLowerCase();
    const computerRoomEntered = bool(signals.computerRoomEntered)
      || number(signals.computerRoomConfidence) >= 0.42;
    const postDoorBridgeRouteEvidence = computerRoomEntered
      || (number(signals.bridgeConfidence) >= 0.38 && number(signals.computerRoomConfidence) >= 0.34)
      || (postDoorRouteText.indexOf("cross-bridge") >= 0 && number(signals.computerRoomConfidence) >= 0.34);
    const strongBridgeDoorEvidence =
      number(signals.bridgeDoorScore) >= 0.34
      && number(signals.bridgeConfidence) >= 0.48
      && number(signals.postDoorTerminalSurface) >= 0.42;
    const centralDoorEvidence = computerRoomEntered
      && (
        number(signals.centralHallConfidence) >= 0.18
        || strongBridgeDoorEvidence
        || /central[- ]?hall|central[- ]?door|second[- ]?door/.test(postDoorRouteText)
      );
    const confirmedComputerRoomEntry = computerRoomEntered;
    const visibleCentralHallEntrance = firstDoorOpened
      && !bool(signals.centralHallEntered)
      && centralDoorEvidence
      && (bool(signals.computerRoomEntered)
        || number(signals.computerRoomConfidence) >= 0.34
        || number(signals.bridgeConfidence) >= 0.38
        || postDoorRouteText.indexOf("computer-room") >= 0
        || postDoorRouteText.indexOf("cross-bridge") >= 0);
    if (!firstDoorOpened && POST_FIRST_DOOR_OBJECTIVES.includes(canonical)) {
      return objectiveRoute("find-corridor-to-first-door", "find-route", "first-door-locked", requested);
    }

    const health = resolveHealthPercent(100, signals.healthSensor, signals);
    const lowHealthThreshold = number(signals?.healthSensor?.lowHealthThreshold ?? signals.lowHealthThreshold, 50);
    const lowHealth = currentLowHealth(signals, health, lowHealthThreshold);
    const criticalHealth = health > 0 && health < 18;
    if (firstDoorOpened && lowHealth) {
      const postDoorGoal = goalFirstObjective(signals);
      return objectiveRoute(
        postDoorGoal,
        criticalHealth ? "survival-goal-first" : "goal-first",
        criticalHealth ? "critical-health-goal-first" : "low-health-goal-first",
        requested);
    }

    if (bool(signals.exitSwitchPressed)) {
      return objectiveRoute("level-clear", "finish", "exit-switch-pressed", requested);
    }

    if (visibleCentralHallEntrance) {
      return objectiveRoute(
        "reach-central-hall",
        "navigate-landmark",
        isStalePostDoorRequest(requested) || PRE_FIRST_DOOR_CANONICAL_OBJECTIVES.includes(canonical)
          ? "visible-central-hall-overrides-stale-request"
          : "central-door-evidence",
        requested);
    }

    if (firstDoorOpened
      && !bool(signals.centralHallEntered)
      && bool(signals.computerRoomEntered)
      && !centralDoorEvidence) {
      return objectiveRoute(
        "reach-central-hall",
        "navigate-landmark",
        structuralDecoy ? "computer-room-structural-decoy-route-hold" : "computer-room-post-door-route-hold",
        requested);
    }

    if (bool(signals.finalRoomEntered)) {
      return objectiveRoute("press-exit-switch", "use-exit", "final-room-entered", requested);
    }

    if (bool(signals.stairsEntered) || number(signals.doorOpenedCount) > 1 || number(signals.finalRoomConfidence) >= 0.45) {
      return objectiveRoute("reach-final-room", "advance-exit-route", "final-route-evidence", requested);
    }

    if (firstDoorOpened
      && !bool(signals.centralHallEntered)
      && (structuralDecoy || !trustedCombatEvidence)
      && number(signals.computerRoomConfidence) >= 0.18) {
      return objectiveRoute(
        centralDoorEvidence
          ? "reach-central-hall"
          : (postDoorBridgeRouteEvidence || confirmedComputerRoomEntry ? "reach-bridge" : "enter-computer-room"),
        "navigate-landmark",
        structuralDecoy ? "post-door-structural-decoy" : "post-door-route-hold",
        requested);
    }

    if (firstDoorOpened
      && !bool(signals.centralHallEntered)
      && bool(signals.computerRoomEntered)
      && !centralDoorEvidence
      && canonical !== "reach-bridge"
      && !(isStalePostDoorRequest(requested) || PRE_FIRST_DOOR_CANONICAL_OBJECTIVES.includes(canonical))
      && (structuralDecoy || !trustedCombatEvidence || !actionableEnemy)) {
      return objectiveRoute(
        "reach-central-hall",
        "navigate-landmark",
        structuralDecoy ? "computer-room-structural-decoy-route-hold" : "computer-room-route-hold",
        requested);
    }

    if (firstDoorOpened
      && !bool(signals.centralHallEntered)
      && (isStalePostDoorRequest(requested)
        || PRE_FIRST_DOOR_CANONICAL_OBJECTIVES.includes(canonical))) {
      return objectiveRoute(
        centralDoorEvidence
          ? "reach-central-hall"
          : (postDoorBridgeRouteEvidence || bool(signals.computerRoomEntered) ? "reach-bridge" : "enter-computer-room"),
        "navigate-landmark",
        "post-door-stale-first-door-request",
        requested);
    }

    if (canonical
      && firstDoorOpened
      && !bool(signals.computerRoomEntered)
      && (canonical === "reach-central-hall"
        || canonical === "reach-bridge"
        || canonical === "secure-central-hall"
        || canonical === "reach-final-room"
        || canonical === "press-exit-switch"
        || canonical === "level-clear")) {
      return objectiveRoute(
        "enter-computer-room",
        "navigate-landmark",
        "post-door-room-entry-required",
        requested);
    }

    if (canonical
      && !(firstDoorOpened && PRE_FIRST_DOOR_CANONICAL_OBJECTIVES.includes(canonical))
      && !(firstDoorOpened && canonical === "stabilize-safe-zone" && !lowHealth)) {
      return objectiveRoute(canonical, "canonical-objective", "canonical-map", requested);
    }

    if (bool(signals.centralHallEntered)) {
      if (number(signals.enemyDefeatedCount) > 0 || bool(signals.ammoLikelyEmpty)) {
        return objectiveRoute("reach-final-room", "advance-exit-route", "central-hall-cleared", requested);
      }

      if (actionableEnemy || number(signals.audioEnemyConfidence) >= 0.34) {
        return objectiveRoute("engage-front-enemy", "fire-and-advance", "central-hall-enemy", requested);
      }

      return objectiveRoute("secure-central-hall", "survey-threat", "central-hall-entered", requested);
    }

    if (actionableEnemy && number(signals.enemyConfidence) >= 0.35) {
      return objectiveRoute("avoid-enemy", "evade", "enemy-evidence", requested);
    }

    const doorEvidence = number(signals.doorConfidence) >= 0.34;
    if (!firstDoorOpened && doorEvidence) {
      return objectiveRoute("open-door", "use-door", "first-door-evidence", requested);
    }

    const routeEvidence = number(signals.corridorConfidence) >= 0.48
      || number(signals.spawnCorridorGapScore) >= 0.24;
    if (!firstDoorOpened && routeEvidence) {
      return objectiveRoute("locate-first-door-corridor", "align-route", "first-door-route-evidence", requested);
    }

    if (!firstDoorOpened && number(signals.spawnLandmarkRouteEvidence) >= 0.28) {
      return objectiveRoute("follow-demo-route-to-first-door", "follow-landmark-route", "spawn-landmark-route", requested);
    }

    if (firstDoorOpened
      && !bool(signals.centralHallEntered)
      && postDoorBridgeRouteEvidence
      && centralDoorEvidence) {
      return objectiveRoute("reach-central-hall", "navigate-landmark", "central-door-evidence", requested);
    }

    if (firstDoorOpened && number(signals.bridgeConfidence) >= 0.30) {
      return objectiveRoute("reach-bridge", "navigate-landmark", "bridge-evidence", requested);
    }

    if (firstDoorOpened && number(signals.computerRoomConfidence) >= 0.35) {
      return objectiveRoute(
        bool(signals.computerRoomEntered) ? "reach-central-hall" : "enter-computer-room",
        "navigate-landmark",
        "computer-room-evidence",
        requested);
    }

    if (firstDoorOpened && number(signals.safeZoneConfidence) >= 0.65) {
      return objectiveRoute("reach-bridge", "route-from-safe-zone", "safe-zone-evidence", requested);
    }

    if (!firstDoorOpened) {
      return objectiveRoute("find-corridor-to-first-door", "find-route", requested ? "first-door-required" : "first-door-default", requested);
    }

    if (requested) {
      if (firstDoorOpened && isRecoveryObjective(requested) && !lowHealth) {
        return objectiveRoute(
          goalFirstObjective(signals),
          "navigate-landmark",
          "recovered-health-route",
          requested);
      }

      return objectiveRoute(requested, "honor-requested-objective", "requested", requested);
    }

    return objectiveRoute("advance-route", "advance", "fallback", requested);
  }

  function resolveObjective(signals = {}) {
    return resolveObjectiveRoute(signals).objective;
  }

  self.AIKernelDoomObjectiveRouting = Object.freeze({
    routingId: OBJECTIVE_ROUTING_ID,
    canonicalObjectiveMap: CANONICAL_OBJECTIVE_MAP,
    resolveObjective,
    resolveObjectiveRoute
  });
})();
