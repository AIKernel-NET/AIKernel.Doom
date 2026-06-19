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
    "reach-central-hall": "reach-bridge",
    "engage-front-enemy": "avoid-enemy",
    "secure-central-hall": "avoid-enemy",
    "enter-computer-control-room": "enter-computer-room",
    "restore-relative-motion": "stabilize-safe-zone",
    "retry-after-death": "stabilize-safe-zone"
  });

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

  function resolveObjectiveRoute(signals = {}) {
    const requested = String(signals?.semanticObjective || signals?.currentObjective || "").trim();
    const canonical = CANONICAL_OBJECTIVE_MAP[requested];
    const firstDoorOpened = bool(signals.firstDoorOpened);
    if (!firstDoorOpened && (canonical === "reach-bridge" || canonical === "enter-computer-room")) {
      return objectiveRoute("find-corridor-to-first-door", "find-route", "first-door-locked", requested);
    }

    if (canonical) {
      return objectiveRoute(canonical, "canonical-objective", "canonical-map", requested);
    }

    const health = number(signals.health, 100);
    if (health > 0 && health < 18) {
      return objectiveRoute("stabilize-safe-zone", "recover", "low-health", requested);
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

    if (firstDoorOpened && number(signals.bridgeConfidence) >= 0.35) {
      return objectiveRoute("reach-bridge", "navigate-landmark", "bridge-evidence", requested);
    }

    if (firstDoorOpened && number(signals.computerRoomConfidence) >= 0.35) {
      return objectiveRoute("enter-computer-room", "navigate-landmark", "computer-room-evidence", requested);
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
