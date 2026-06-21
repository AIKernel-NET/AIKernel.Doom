(function () {
  "use strict";

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeAxis(axis) {
    const normalized = String(axis || "LOGOS").trim().toUpperCase();
    if (normalized === "PATHOS" || normalized === "ETHOS" || normalized === "LOGOS") {
      return normalized;
    }

    return "LOGOS";
  }

  function composeFirstDoorPriorityContext(input = {}) {
    const firstDoorContext = Boolean(input.firstDoorContext);
    const depthEstimate = number(input.depthEstimate, 1);
    const useDepth = number(input.firstDoorUseDepth);
    const useSignatureThreshold = number(input.firstDoorUseSignatureThreshold);
    const retrySignatureTolerance = number(input.firstDoorRetrySignatureTolerance);
    const alignmentScore = number(input.firstDoorAlignmentScore);
    const use3x3Score = number(input.firstDoorUse3x3Score);
    const corridorSignature = number(input.firstDoorCorridorSignature);
    const firstDoorRouteEvidence = Math.max(
      corridorSignature,
      number(input.firstDoorVision9x9Score),
      number(input.spawnCorridorGapScore));
    const alignmentReady = number(input.routeEvidence) >= 0.38
      || use3x3Score >= alignmentScore - 0.08
      || corridorSignature >= useSignatureThreshold - retrySignatureTolerance;
    const contactReady = use3x3Score >= alignmentScore
      || corridorSignature >= useSignatureThreshold - retrySignatureTolerance;

    return {
      firstDoorContext,
      firstDoorAlignmentWindow: firstDoorContext
        && depthEstimate >= 0.18
        && depthEstimate <= useDepth + 0.18
        && number(input.danger) < 0.32
        && alignmentReady,
      firstDoorRouteEvidence,
      contactUseReady: firstDoorContext
        && depthEstimate <= useDepth + 0.06
        && number(input.pathos) < 0.58
        && contactReady
        && number(input.useCooldown) === 0
        && !input.firstDoorUseAttempted,
      depthEstimate,
      wallHugSide: input.wallHugSide === "left" || input.wallHugSide === "right" ? input.wallHugSide : "none"
    };
  }

  function resolveMonitoringState(input = {}) {
    const reason = String(input.reason || "none");
    const contextReset = Boolean(input.contextResetActive) || reason.indexOf("relocalization") >= 0;
    const recovery = Boolean(input.recoveryActive);
    const useProbe = !input.doorTransitionGraceActive && Boolean(input.useProbeActive);
    const threatEvidence = Math.max(
      clamp01(input.trustedEnemyThreat),
      clamp01(input.projectileScore),
      input.loomingActive ? 0.72 : 0,
      input.damageLocalizationActive ? 0.72 : 0);
    const combat = Boolean(input.combatEvidence
      && (input.combatContextActive || input.enemyAlertActive || reason.indexOf("combat") >= 0)
      && threatEvidence >= 0.34);
    const danger = number(input.danger);
    const stuck = number(input.stuck);
    const abnormal = contextReset
      || recovery
      || useProbe
      || combat
      || (!input.doorTransitionGraceActive && stuck >= 0.58)
      || danger >= 0.55;
    let state = "Monitor";
    let trigger = reason || "none";
    if (contextReset) {
      state = "Survey";
      trigger = input.contextResetReason || reason || "visual-discontinuity";
    } else if (combat) {
      state = "CombatWatch";
      trigger = reason || "dynamic-mask";
    } else if (useProbe) {
      state = "UseProbe";
      trigger = reason || "use-response";
    } else if (recovery || stuck >= 0.58) {
      state = "Recovery";
      trigger = reason || "motion-stall";
    } else if (danger >= 0.55) {
      state = "Caution";
      trigger = reason || "danger";
    }

    const boost = abnormal
      ? clamp01(Math.max(danger, stuck, contextReset ? 0.74 : 0, combat ? 0.62 : 0, useProbe ? 0.48 : 0))
      : 0;
    return { active: abnormal, state, trigger, boost: round2(boost) };
  }

  function resolveKairos(input = {}) {
    return resolveMonitoringState(input);
  }

  function resolvePriorityAxes(input = {}) {
    const carrier = input.carrier || {};
    const observed = input.observed || input.observedScores || {};
    const firstDoor = input.firstDoor || {};
    const weights = input.weights || carrier.weights || observed.weights || {};
    const logos = clamp01(input.logos ?? observed.logos ?? weights.logos);
    const pathos = clamp01(input.pathos ?? observed.pathos ?? weights.pathos);
    const ethos = clamp01(input.ethos ?? observed.ethos ?? weights.ethos);
    const danger = clamp01(input.danger ?? observed.danger);
    const stuck = clamp01(input.stuck ?? observed.stuck);
    const routeEvidence = clamp01(input.firstDoorRouteEvidence ?? firstDoor.firstDoorRouteEvidence);
    const depthEstimate = number(input.depthEstimate ?? firstDoor.depthEstimate, 1);
    const firstDoorContext = Boolean(input.firstDoorContext ?? firstDoor.firstDoorContext);
    const firstDoorAlignmentWindow = Boolean(input.firstDoorAlignmentWindow ?? firstDoor.firstDoorAlignmentWindow);
    const contactUseReady = Boolean(input.contactUseReady ?? firstDoor.contactUseReady);
    const dominantAxis = normalizeAxis(input.dominantAxis || carrier.dominantAxis || observed.dominant);
    const pathosPriority = round2(Math.max(pathos, danger, stuck * 0.76, clamp01(weights.pathos)));
    const ethosPriority = round2(Math.max(ethos, contactUseReady ? 0.72 : 0));
    const logosPriority = round2(Math.max(logos, routeEvidence));
    const shouldAdvanceFirstDoor = Boolean(input.shouldAdvanceFirstDoor)
      || (firstDoorContext
        && logos + ethos >= pathos + 0.16
        && depthEstimate >= 0.34
        && routeEvidence >= 0.48);
    const routeAdvanceProtected = shouldAdvanceFirstDoor
      || (firstDoorContext
        && routeEvidence >= 0.34
        && danger < 0.32
        && depthEstimate > 0.36);

    return {
      dominantAxis,
      selectedAxis: dominantAxis.toLowerCase(),
      pathosPriority,
      ethosPriority,
      logosPriority,
      pathosDominant: dominantAxis === "PATHOS" || pathosPriority >= 0.58,
      firstDoorContext,
      firstDoorAlignmentWindow,
      firstDoorRouteEvidence: routeEvidence,
      contactUseReady,
      shouldAdvanceFirstDoor,
      routeAdvanceProtected,
      depthEstimate,
      wallHugSide: firstDoor.wallHugSide === "left" || firstDoor.wallHugSide === "right" ? firstDoor.wallHugSide : "none",
      danger,
      stuck,
      pathos,
      logos,
      ethos
    };
  }

  function normalizePriorityAxes(input = {}) {
    return resolvePriorityAxes(input);
  }

  self.AIKernelDoomKairos = Object.freeze({
    composeFirstDoorPriorityContext,
    normalizePriorityAxes,
    resolveKairos,
    resolveMonitoringState,
    resolvePriorityAxes
  });
})();
