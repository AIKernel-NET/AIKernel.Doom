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

    if (bool(signals.computerRoomEntered) || number(signals.computerRoomConfidence) >= 0.35 || number(signals.bridgeConfidence) >= 0.30) {
      return "reach-central-hall";
    }

    return "enter-computer-room";
  }

  function resolveObjectiveRoute(signals = {}) {
    const requested = String(signals?.semanticObjective || signals?.currentObjective || "").trim();
    const canonical = CANONICAL_OBJECTIVE_MAP[requested];
    const firstDoorOpened = bool(signals.firstDoorOpened);
    if (!firstDoorOpened && POST_FIRST_DOOR_OBJECTIVES.includes(canonical)) {
      return objectiveRoute("find-corridor-to-first-door", "find-route", "first-door-locked", requested);
    }

    const health = number(signals.health, 100);
    const lowHealth = health > 0 && health < 50;
    const criticalHealth = health > 0 && health < 18;
    if (firstDoorOpened && lowHealth) {
      return objectiveRoute(
        criticalHealth && !bool(signals.centralHallEntered) && !bool(signals.finalRoomEntered)
          ? "stabilize-safe-zone"
          : goalFirstObjective(signals),
        criticalHealth ? "recover" : "goal-first",
        criticalHealth ? "low-health" : "low-health-goal-first",
        requested);
    }

    if (!firstDoorOpened && health > 0 && health < 18) {
      return objectiveRoute("stabilize-safe-zone", "recover", "low-health", requested);
    }

    if (bool(signals.exitSwitchPressed)) {
      return objectiveRoute("level-clear", "finish", "exit-switch-pressed", requested);
    }

    if (bool(signals.finalRoomEntered)) {
      return objectiveRoute("press-exit-switch", "use-exit", "final-room-entered", requested);
    }

    if (bool(signals.stairsEntered) || number(signals.doorOpenedCount) > 1 || number(signals.finalRoomConfidence) >= 0.45) {
      return objectiveRoute("reach-final-room", "advance-exit-route", "final-route-evidence", requested);
    }

    if (canonical && !(firstDoorOpened && PRE_FIRST_DOOR_CANONICAL_OBJECTIVES.includes(canonical))) {
      return objectiveRoute(canonical, "canonical-objective", "canonical-map", requested);
    }

    if (bool(signals.centralHallEntered)) {
      if (number(signals.enemyDefeatedCount) > 0 || bool(signals.ammoLikelyEmpty)) {
        return objectiveRoute("reach-final-room", "advance-exit-route", "central-hall-cleared", requested);
      }

      if (number(signals.enemyConfidence) >= 0.18 || number(signals.audioEnemyConfidence) >= 0.18) {
        return objectiveRoute("engage-front-enemy", "fire-and-advance", "central-hall-enemy", requested);
      }

      return objectiveRoute("secure-central-hall", "survey-threat", "central-hall-entered", requested);
    }

    if (number(signals.enemyConfidence) >= 0.35) {
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
