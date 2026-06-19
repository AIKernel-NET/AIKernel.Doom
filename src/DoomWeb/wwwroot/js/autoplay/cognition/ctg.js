(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const CTG_ROM_CANON_ID = "Canon.CTG.Monolith";
  const CTG_ROM_POLICY_ID = "ctg-rom.monolith.v0.1.1";

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toposApi() {
    return self.AIKernelDoomTopos || {};
  }

  function normalizeWeights(logos, pathos, ethos) {
    return typeof toposApi().normalizeWeights === "function"
      ? toposApi().normalizeWeights(logos, pathos, ethos)
      : { logos: 0, pathos: 0, ethos: 0 };
  }

  function normalizeVector(vector) {
    return typeof toposApi().normalizeVector === "function"
      ? toposApi().normalizeVector(vector)
      : { x: 0, y: 0, magnitude: 0, turn: "none", move: "none", arrow: "-", source: "none" };
  }

  function createToposDecisionCarrier(overrides) {
    return typeof toposApi().createDecisionCarrier === "function"
      ? toposApi().createDecisionCarrier(overrides)
      : { source: "vector-superposition", decisionVector: normalizeVector(), dominantAxis: "LOGOS" };
  }

  function createObservedScores(overrides = {}) {
    const logos = clamp01(Number(overrides.logos ?? 0));
    const pathos = clamp01(Number(overrides.pathos ?? 0));
    const ethos = clamp01(Number(overrides.ethos ?? 0));
    const weights = normalizeWeights(logos, pathos, ethos);
    const dominant = pathos >= Math.max(logos, ethos)
      ? "PATHOS"
      : (ethos >= Math.max(logos, pathos) ? "ETHOS" : "LOGOS");
    return {
      logos: round2(logos),
      pathos: round2(pathos),
      ethos: round2(ethos),
      weights,
      dominant,
      headingRel: round2(clamp01(Number(overrides.headingRel ?? 0))),
      routeEvidence: round2(clamp01(Number(overrides.routeEvidence ?? 0))),
      corridorConfidence: round2(clamp01(Number(overrides.corridorConfidence ?? 0))),
      corridorPenalty: round2(clamp01(Number(overrides.corridorPenalty ?? 0))),
      danger: round2(clamp01(Number(overrides.danger ?? 0))),
      dangerKind: overrides.dangerKind || "none",
      stuck: round2(clamp01(Number(overrides.stuck ?? 0))),
      kairosBoost: round2(clamp01(Number(overrides.kairosBoost ?? 0))),
      kairosState: overrides.kairosState || "Monitor",
      kairosTrigger: overrides.kairosTrigger || "none",
      objective: overrides.objective || "disabled",
      phase: overrides.phase || "Idle",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function composeObservedSignals(input = {}) {
    const tensorEvidence = input.tensorEvidence || {};
    const headingConfidence = clamp01(input.headingConfidence);
    const headingRel = input.headingUnavailable
      ? Math.min(headingConfidence, 0.34)
      : Math.max(headingConfidence, input.headingAbsolute ? 0.82 : 0.48);
    const directRouteEvidence = clamp01(input.directRouteEvidence);
    const routeEvidence = clamp01(Math.max(number(tensorEvidence.routeEvidence), directRouteEvidence));
    const directCorridorConfidence = clamp01(input.directCorridorConfidence);
    const corridorConfidence = clamp01(Math.max(number(tensorEvidence.corridorConfidence), directCorridorConfidence));
    const corridorPenalty = corridorConfidence >= 0.7 && headingRel < 0.56 ? 0.12 : 0;
    const logos = clamp01((headingRel * 0.36) + (routeEvidence * 0.48) + (input.hasControlPipeline ? 0.12 : 0.04) - corridorPenalty);
    const projectileRaw = clamp01(input.projectileRaw);
    const enemy = clamp01(input.enemy);
    const dynamicObjectRaw = clamp01(input.dynamicObjectRaw);
    const projectile = input.projectileContext ? projectileRaw : projectileRaw * 0.22;
    const dynamicObject = input.dynamicThreatContext ? dynamicObjectRaw : dynamicObjectRaw * 0.18;
    const health = input.healthThreat ? 1 : 0;
    const nonTerminalDanger = input.terminalUseFocus
      ? Math.max(projectile * 0.28, enemy * 0.24, dynamicObject * 0.18)
      : (input.doorTransitionGraceActive
        ? Math.max(projectile * 0.22, enemy * 0.2, dynamicObject * 0.14)
        : Math.max(projectile, enemy, dynamicObject));
    const danger = clamp01(Math.max(nonTerminalDanger, health));
    const stuckRaw = clamp01(input.stuckRaw);
    let stuck = input.firstRouteWarmup
      ? Math.min(stuckRaw, 0.34)
      : (input.stuckConfirmed ? stuckRaw : Math.min(stuckRaw, 0.34));
    const depthEstimate = number(input.depthEstimate, 1);
    const movingEvidence = clamp01(input.movingEvidence);
    const routeStillViable = input.firstDoorClosed
      && depthEstimate >= 0.55
      && routeEvidence >= 0.46
      && movingEvidence >= 0.08
      && danger < 0.32;
    if (routeStillViable) {
      stuck = Math.min(stuck, 0.42);
    }

    const preDoorDemoRouteStillViable = input.preDoorDemoRouteGraceActive
      && input.firstDoorClosed
      && depthEstimate >= 0.38
      && danger < 0.32
      && !input.firstDoorUseAttempted;
    if (preDoorDemoRouteStillViable) {
      stuck = Math.min(stuck, 0.36);
    }

    const firstDoorUseWindow = input.firstDoorClosed
      && input.firstDoorContext
      && depthEstimate >= 0.18
      && depthEstimate <= number(input.firstDoorUseDepthLimit, 0)
      && (routeEvidence >= 0.38 || input.firstDoorUseEvidence)
      && danger < 0.32
      && !input.firstDoorUseBlockedByThreat;
    if (firstDoorUseWindow) {
      stuck = Math.min(stuck, 0.42);
    }

    if (input.doorTransitionGraceActive && danger < 0.32) {
      stuck = Math.min(stuck, 0.28);
    }

    const postDoorRouteStillViable = input.doorOpened
      && input.computerRoomEntered
      && !input.finalRoomEntered
      && depthEstimate >= 0.46
      && routeEvidence >= 0.28
      && movingEvidence >= 0.05
      && danger < 0.32
      && !input.nousStuckActive;
    if (postDoorRouteStillViable) {
      stuck = Math.min(stuck, 0.42);
    }

    const postDoorTransitionStillViable = input.doorOpened
      && !input.finalRoomEntered
      && depthEstimate >= 0.46
      && danger < 0.32
      && !input.nousStuckActive
      && (input.darkZoneEntered
        || input.controlPipeline === "ComputerRoom"
        || input.computerRoomAdvanceActive
        || routeEvidence >= 0.18);
    if (postDoorTransitionStillViable) {
      stuck = Math.min(stuck, 0.42);
    }

    const dangerKind = health > 0
      ? "health"
      : (projectile >= Math.max(enemy, dynamicObject) && projectile > 0.18
        ? "projectile"
        : (enemy >= Math.max(dynamicObject, 0.18) ? "enemy" : (dynamicObject > 0.18 ? "dynamic" : "none")));

    return {
      logos,
      headingRel,
      routeEvidence,
      corridorConfidence,
      corridorPenalty,
      projectile,
      enemy,
      dynamicObject,
      health,
      terminalUseFocus: Boolean(input.terminalUseFocus),
      danger,
      dangerKind,
      stuck
    };
  }

  function createCarrier(overrides = {}) {
    return {
      canonId: CTG_ROM_CANON_ID,
      policyId: CTG_ROM_POLICY_ID,
      phase: overrides.phase || "Idle",
      pipeline: overrides.pipeline || "Idle",
      lastDecision: overrides.lastDecision || "none",
      confidence: round2(clamp01(Number(overrides.confidence ?? 0))),
      retryRequested: Boolean(overrides.retryRequested),
      retryReason: overrides.retryReason || "none",
      retryPriority: Number(overrides.retryPriority || 0),
      gateExecuted: Boolean(overrides.gateExecuted),
      observedScores: overrides.observedScores || createObservedScores(),
      toposDecision: overrides.toposDecision || createToposDecisionCarrier(),
      toposTrace: overrides.toposTrace || null,
      proposalPacket: overrides.proposalPacket || null,
      councilDecisionTrace: Array.isArray(overrides.councilDecisionTrace) ? overrides.councilDecisionTrace : [],
      gateDecision: overrides.gateDecision || null,
      stepGovernanceTrace: overrides.stepGovernanceTrace || null,
      trajectoryGateTrace: overrides.trajectoryGateTrace || null,
      decisionVector: overrides.decisionVector || normalizeVector(),
      kairos: overrides.kairos || { active: false, state: "Monitor", trigger: "none", boost: 0 },
      ethosTarget: overrides.ethosTarget || { objective: "disabled", phase: "Idle", stableFrames: 0 },
      feedbackApplied: Boolean(overrides.feedbackApplied),
      ternaryTrace: overrides.ternaryTrace || {},
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  self.AIKernelDoomCtg = Object.freeze({
    canonId: CTG_ROM_CANON_ID,
    policyId: CTG_ROM_POLICY_ID,
    composeObservedSignals,
    createCarrier,
    createObservedScores
  });
})();
