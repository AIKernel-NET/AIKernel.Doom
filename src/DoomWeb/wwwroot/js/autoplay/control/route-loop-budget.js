(function () {
  "use strict";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function routeLoopBudgets(routeMode) {
    if (routeMode === "door-approach") {
      return { pivot: 8, slide: 6, backoff: 4, advance: 96, ingress: 72, recover: 0, topology: 36, arc: 96 };
    }

    if (routeMode === "post-door") {
      return { pivot: 10, slide: 8, backoff: 4, advance: 0, ingress: 0, recover: 0, topology: 0, arc: 0 };
    }

    return { pivot: 12, slide: 10, backoff: 5, advance: 0, ingress: 0, recover: 520, topology: 0, arc: 96 };
  }

  function evaluate(rawInput = {}) {
    const routeMode = String(rawInput.routeMode || "spawn-approach").trim().toLowerCase() || "spawn-approach";
    const budgets = routeLoopBudgets(routeMode);
    const turnRepeatFrames = number(rawInput.turnRepeatFrames, 0);
    const actionRepeatFrames = number(rawInput.actionRepeatFrames, 0);
    const moveRepeatFrames = number(rawInput.moveRepeatFrames, 0);
    const motionForwardProgress = number(rawInput.motionForwardProgress, 0);
    const footObstacleScore = number(rawInput.footObstacleScore, 0);
    const motionObstacleScore = number(rawInput.motionObstacleScore, 0);
    const spawnCorridorGapScore = number(rawInput.spawnCorridorGapScore, 0);
    const spawnLandmarkRouteEvidence = number(rawInput.spawnLandmarkRouteEvidence, 0);
    const predictions = number(rawInput.predictions, 0);
    const firstDoorVisionScore = number(rawInput.firstDoorVisionScore, 0);
    const useProbeScore = number(rawInput.useProbeScore, 0);
    const routeDeadEndRisk = Boolean(rawInput.routeDeadEndRisk);
    const eastWindowRecoverAnchor = Boolean(rawInput.eastWindowRecoverAnchor);
    const eastWindowRouteEvidenceReady = Boolean(rawInput.eastWindowRouteEvidenceReady);
    const turnStall = turnRepeatFrames >= 6
      && motionForwardProgress < 0.10
      && spawnCorridorGapScore < 0.25
      && spawnLandmarkRouteEvidence < 0.45;
    const slideStall = actionRepeatFrames >= 8
      && motionForwardProgress < 0.18
      && footObstacleScore >= 0.48
      && motionObstacleScore >= 0.48
      && spawnCorridorGapScore < 0.25;
    const cornerStall = actionRepeatFrames >= 4
      && motionForwardProgress < 0.10
      && footObstacleScore >= 0.55
      && spawnCorridorGapScore < 0.25;
    const recoverStall = routeMode === "spawn-approach"
      && predictions >= 900
      && eastWindowRecoverAnchor
      && eastWindowRouteEvidenceReady
      && turnRepeatFrames < 6
      && actionRepeatFrames < 8
      && firstDoorVisionScore < 0.42
      && useProbeScore < 0.22
      && spawnCorridorGapScore < 0.42;
    const spawnRouteArc = predictions >= 260
      && predictions < 520
      && Math.max(actionRepeatFrames, turnRepeatFrames) >= 1
      && motionForwardProgress >= 0.20
      && Math.max(spawnCorridorGapScore, spawnLandmarkRouteEvidence) >= 0.30
      && useProbeScore < 0.22;
    const topologyStall = routeMode === "door-approach"
      && routeDeadEndRisk
      && predictions >= 700
      && Math.max(moveRepeatFrames, actionRepeatFrames) >= 24
      && firstDoorVisionScore < 0.42
      && useProbeScore < 0.22;
    const advanceStall = routeMode === "door-approach"
      && predictions >= 900
      && actionRepeatFrames >= 24
      && motionForwardProgress < 0.75
      && footObstacleScore >= 0.48
      && motionObstacleScore >= 0.48
      && spawnCorridorGapScore < 0.25
      && spawnLandmarkRouteEvidence >= 0.30
      && spawnLandmarkRouteEvidence < 0.45
      && firstDoorVisionScore < 0.42
      && useProbeScore < 0.22;
    const ingressLoop = routeMode === "door-approach"
      && predictions >= 520
      && predictions < 1900
      && actionRepeatFrames >= 72
      && motionForwardProgress >= 0.40
      && motionForwardProgress < 0.85
      && spawnCorridorGapScore >= 0.18
      && spawnCorridorGapScore < 0.25
      && spawnLandmarkRouteEvidence >= 0.30
      && spawnLandmarkRouteEvidence < 0.42
      && firstDoorVisionScore < 0.42
      && useProbeScore < 0.22;
    const pivotUsed = turnStall ? turnRepeatFrames : 0;
    const slideUsed = slideStall ? actionRepeatFrames : 0;
    const backoffUsed = cornerStall ? Math.max(moveRepeatFrames, actionRepeatFrames) : 0;
    const advanceUsed = advanceStall ? actionRepeatFrames : 0;
    const ingressUsed = ingressLoop ? actionRepeatFrames : 0;
    const recoverUsed = recoverStall ? Math.max(0, predictions - 900) : 0;
    const topologyUsed = topologyStall ? Math.max(moveRepeatFrames, actionRepeatFrames) : 0;
    const arcUsed = spawnRouteArc ? Math.max(actionRepeatFrames, turnRepeatFrames) : 0;
    const pivotExceeded = pivotUsed >= budgets.pivot;
    const slideExceeded = slideUsed >= budgets.slide;
    const backoffExceeded = backoffUsed >= budgets.backoff;
    const advanceExceeded = budgets.advance > 0 && advanceUsed >= budgets.advance;
    const ingressExceeded = budgets.ingress > 0 && ingressUsed >= budgets.ingress;
    const recoverExceeded = budgets.recover > 0 && recoverUsed >= budgets.recover;
    const topologyExceeded = budgets.topology > 0 && topologyUsed >= budgets.topology;
    const arcExceeded = budgets.arc > 0 && arcUsed >= budgets.arc;
    const exceeded = pivotExceeded || slideExceeded || backoffExceeded || topologyExceeded || advanceExceeded || ingressExceeded || arcExceeded || recoverExceeded;
    const loopKind = pivotExceeded
      ? "turn-stall"
      : (slideExceeded ? "slide-stall" : (backoffExceeded ? "corner-stall" : (topologyExceeded ? "door-approach-dead-end" : (advanceExceeded ? "advance-stall" : (ingressExceeded ? "ingress-loop" : (arcExceeded ? "spawn-route-arc" : (recoverExceeded ? "recover-stall" : "none")))))));

    return {
      routeMode,
      loopKind,
      routeAbortHint: exceeded ? loopKind : "none",
      exceeded,
      pivotUsed,
      pivotBudget: budgets.pivot,
      pivotExceeded,
      slideUsed,
      slideBudget: budgets.slide,
      slideExceeded,
      backoffUsed,
      backoffBudget: budgets.backoff,
      backoffExceeded,
      advanceUsed,
      advanceBudget: budgets.advance,
      advanceExceeded,
      ingressUsed,
      ingressBudget: budgets.ingress,
      ingressExceeded,
      recoverUsed,
      recoverBudget: budgets.recover,
      recoverExceeded,
      topologyUsed,
      topologyBudget: budgets.topology,
      topologyExceeded,
      arcUsed,
      arcBudget: budgets.arc,
      arcExceeded
    };
  }

  self.AIKernelDoomRouteLoopBudget = Object.freeze({
    evaluate
  });
})();
