(function () {
  "use strict";

  const OBJECTIVE_ROUTING_ID = "doom-scoped-objective-routing-v1";
  const CANONICAL_OBJECTIVE_MAP = Object.freeze({
    "open-first-door": "open-door",
    "align-first-door": "open-door",
    "approach-first-door": "open-door",
    "find-and-open-first-door": "open-door",
    "enter-first-door-corridor": "open-door",
    "locate-first-door-corridor": "open-door",
    "find-corridor-to-first-door": "open-door",
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

    const doorEvidence = number(signals.doorConfidence) >= 0.30
      || number(signals.corridorConfidence) >= 0.48
      || signals.contextDict === "wall";
    if (!signals.firstDoorOpened && doorEvidence) {
      return objectiveRoute("open-door", "use-door", "first-door-evidence", requested);
    }

    if (number(signals.bridgeConfidence) >= 0.35) {
      return objectiveRoute("reach-bridge", "navigate-landmark", "bridge-evidence", requested);
    }

    if (number(signals.computerRoomConfidence) >= 0.35) {
      return objectiveRoute("enter-computer-room", "navigate-landmark", "computer-room-evidence", requested);
    }

    if (number(signals.safeZoneConfidence) >= 0.65) {
      return objectiveRoute("reach-bridge", "route-from-safe-zone", "safe-zone-evidence", requested);
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
