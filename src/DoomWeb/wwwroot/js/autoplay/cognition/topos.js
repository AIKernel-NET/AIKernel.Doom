(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function clampSigned(value) {
    return Math.max(-1, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeWeights(logos, pathos, ethos) {
    const l = clamp01(Number(logos || 0));
    const p = clamp01(Number(pathos || 0));
    const e = clamp01(Number(ethos || 0));
    const total = Math.max(0.0001, l + p + e);
    return {
      logos: round2(l / total),
      pathos: round2(p / total),
      ethos: round2(e / total)
    };
  }

  function normalizeVector(vector = {}) {
    const rawX = clampSigned(Number(vector?.x ?? 0));
    const rawY = clampSigned(Number(vector?.y ?? 0));
    const magnitude = Math.hypot(rawX, rawY);
    const x = magnitude > 0.0001 ? clampSigned(rawX / magnitude) : 0;
    const y = magnitude > 0.0001 ? clampSigned(rawY / magnitude) : 0;
    return {
      x: round2(x),
      y: round2(y),
      magnitude: round2(Math.min(1, magnitude)),
      turn: x > 0.18 ? "right" : (x < -0.18 ? "left" : "none"),
      move: y > 0.24 ? "forward" : (y < -0.24 ? "back" : "none"),
      arrow: vectorArrow(x, y),
      source: vector?.source || "none"
    };
  }

  function vectorArrow(x, y) {
    if (Math.abs(x) < 0.18 && Math.abs(y) < 0.18) {
      return "-";
    }

    if (Math.abs(x) < 0.22) {
      return y >= 0 ? "^" : "v";
    }

    if (Math.abs(y) < 0.22) {
      return x >= 0 ? ">" : "<";
    }

    if (x >= 0 && y >= 0) {
      return "^>";
    }
    if (x < 0 && y >= 0) {
      return "<^";
    }
    if (x >= 0) {
      return "v>";
    }
    return "<v";
  }

  function turnToX(turn) {
    return turn === "right" ? 1 : (turn === "left" ? -1 : 0);
  }

  function oppositeTurn(turn) {
    return turn === "right" ? "left" : (turn === "left" ? "right" : "none");
  }

  function createDecisionCarrier(overrides = {}) {
    const weights = overrides.weights || normalizeWeights(0, 0, 0);
    const decisionVector = normalizeVector(overrides.decisionVector);
    return {
      source: overrides.source || "vector-superposition",
      logosVector: normalizeVector(overrides.logosVector),
      pathosVector: normalizeVector(overrides.pathosVector),
      ethosVector: normalizeVector(overrides.ethosVector),
      weights,
      decisionVector,
      dominantAxis: overrides.dominantAxis || "LOGOS",
      confidence: round2(clamp01(Number(overrides.confidence ?? 0))),
      kairos: overrides.kairos || { active: false, state: "Monitor", trigger: "none", boost: 0 },
      ethosTarget: overrides.ethosTarget || { objective: "disabled", phase: "Idle", stableFrames: 0 },
      feedbackApplied: Boolean(overrides.feedbackApplied),
      feedbackReason: overrides.feedbackReason || "none",
      mappedAction: overrides.mappedAction || "-",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function composeDecisionCarrier(input = {}) {
    const observed = input.observed || {};
    const logosVector = normalizeVector(input.logosVector);
    const pathosVector = normalizeVector(input.pathosVector);
    const ethosVector = normalizeVector(input.ethosVector);
    const weights = observed.weights || normalizeWeights(observed.logos, observed.pathos, observed.ethos);
    const rawX = (number(weights.logos) * logosVector.x)
      + (number(weights.pathos) * pathosVector.x)
      + (number(weights.ethos) * ethosVector.x);
    const rawY = (number(weights.logos) * logosVector.y)
      + (number(weights.pathos) * pathosVector.y)
      + (number(weights.ethos) * ethosVector.y);

    return createDecisionCarrier({
      source: "vector-superposition",
      logosVector,
      pathosVector,
      ethosVector,
      weights,
      decisionVector: normalizeVector({ x: rawX, y: rawY }),
      confidence: Math.max(number(observed.logos), number(observed.pathos), number(observed.ethos)),
      dominantAxis: observed.dominant,
      kairos: {
        active: number(observed.kairosBoost) > 0,
        state: observed.kairosState,
        trigger: observed.kairosTrigger,
        boost: observed.kairosBoost
      },
      ethosTarget: {
        objective: observed.objective,
        phase: observed.phase,
        stableFrames: number(input.stableFrames)
      },
      timestamp: observed.timestamp || input.timestamp
    });
  }

  function resolveLogosVector(input = {}) {
    const firstDoorClosed = !input.doorOpened;
    let x = turnToX(input.firstDoorUseTurn);
    let y = 0.62;
    if (input.patchVisible && firstDoorClosed) {
      const gridColumns = Math.max(1, number(input.gridColumns, 9));
      const patchColumns = Math.max(1, number(input.patchColumns, 1));
      const center = (number(input.patchColumn) + patchColumns * 0.5) / gridColumns;
      const patchBias = clampSigned((center - 0.5) * 2.4);
      const patchScore = clamp01(input.patchScore);
      x = clampSigned((x * 0.35) + (patchBias * patchScore * 0.65));
      y = clampSigned(0.32 + patchScore * 0.68);
    } else if (input.doorOpened && input.computerRoomEntered) {
      x = turnToX(input.bridgeLaneTurn) || turnToX(input.actionTurn);
      y = number(input.bridgeBrownScore) >= 0.35 ? 0.86 : 0.58;
    } else if (input.spawnCorridorGapTurn === "left" || input.spawnCorridorGapTurn === "right") {
      x = turnToX(input.spawnCorridorGapTurn);
      y = 0.78;
    } else if (!x) {
      x = turnToX(input.actionTurn);
    }

    if (number(input.depthEstimate, 1) <= 0.24 && firstDoorClosed) {
      y = Math.min(y, 0.22);
    }

    return normalizeVector({
      x,
      y,
      source: firstDoorClosed ? "local-door-landmark" : "local-route-landmark"
    });
  }

  function resolvePathosVector(input = {}) {
    const stuck = clamp01(Math.max(
      number(input.motionStallScore),
      number(input.stuckFrames) / 12,
      number(input.quantizedStallFrames) / 10,
      number(input.footObstacleBounceFrames) >= 3 ? number(input.footObstacleFlickerScore) : 0));
    const projectileRaw = clamp01(input.projectileRaw);
    const enemy = clamp01(input.enemy);
    const dynamicRaw = clamp01(input.dynamicRaw);
    const danger = clamp01(Math.max(
      input.dynamicThreatContext ? projectileRaw : projectileRaw * 0.22,
      enemy,
      input.dynamicThreatContext ? dynamicRaw : dynamicRaw * 0.18,
      input.healthThreat ? 1 : 0));
    const enemyBias = clampSigned(input.enemyLateralBias);
    const closeWall = number(input.depthEstimate, 1) <= 0.34 || stuck >= 0.52;
    let x = enemyBias ? -enemyBias : 0;
    if (!x && (input.actionTurn === "left" || input.actionTurn === "right")) {
      x = turnToX(oppositeTurn(input.actionTurn)) * Math.max(0.28, stuck);
    }
    if (!x && input.wallHugSide === "left") {
      x = 0.42;
    } else if (!x && input.wallHugSide === "right") {
      x = -0.42;
    }

    const y = closeWall || danger >= 0.42
      ? -Math.max(0.42, stuck, danger)
      : -Math.max(0.12, danger * 0.72);
    return normalizeVector({
      x,
      y,
      source: danger >= stuck ? "danger-repulsion" : "stall-repulsion"
    });
  }

  function resolveEthosVector(input = {}) {
    const objective = input.objective || "disabled";
    let x = 0;
    let y = 0.72;
    if (objective === "find-corridor-to-first-door"
      || objective === "follow-demo-route-to-first-door"
      || objective === "recover-via-east-window"
      || objective === "locate-first-door-corridor"
      || objective === "enter-first-door-corridor") {
      x = turnToX(input.spawnCorridorGapTurn) || turnToX(input.firstDoorCorridorSearchTurn) || 0.34;
      y = objective === "enter-first-door-corridor" || objective === "recover-via-east-window" ? 0.88 : 0.76;
    } else if (objective === "align-first-door"
      || objective === "approach-first-door"
      || objective === "open-first-door"
      || objective === "find-and-open-first-door") {
      x = turnToX(input.firstDoorUseTurn) || turnToX(input.spawnCorridorGapTurn) || turnToX(input.firstDoorCorridorSearchTurn) || 0.18;
      y = objective === "open-first-door" ? 0.42 : 0.68;
    } else if (objective === "enter-computer-control-room") {
      x = turnToX(input.bridgeLaneTurn) || 0;
      y = 0.92;
    } else if (objective === "reach-central-hall" || objective === "cross-bridge") {
      x = turnToX(input.bridgeLaneTurn) || 0;
      y = 0.9;
    } else if (objective === "retry-after-death") {
      x = 0;
      y = 0;
    } else if (objective === "restore-relative-motion") {
      x = turnToX(input.wallHugSide === "left" ? "right" : "left");
      y = -0.24;
    }

    const stability = clamp01(number(input.stableFrames) / 18);
    return normalizeVector({
      x: x * (0.58 + stability * 0.42),
      y,
      source: `telos-${objective}`
    });
  }

  function resolveKairos(input = {}) {
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

  function resolveEthosScore(input = {}) {
    const objective = input.objective || "disabled";
    let score = 0.44;
    if (objective === "retry-after-death") {
      score = 1;
    } else if (objective === "find-corridor-to-first-door"
      || objective === "follow-demo-route-to-first-door"
      || objective === "recover-via-east-window"
      || objective === "locate-first-door-corridor") {
      score = 0.68;
    } else if (objective === "enter-first-door-corridor") {
      score = 0.74;
    } else if (objective === "align-first-door"
      || objective === "approach-first-door"
      || objective === "open-first-door"
      || objective === "find-and-open-first-door") {
      score = 0.78;
    } else if (objective === "enter-computer-control-room") {
      score = 0.82;
    } else if (objective === "reach-central-hall") {
      score = 0.76;
    } else if (objective === "cross-bridge" || objective === "reach-final-room") {
      score = 0.8;
    } else if (objective === "restore-relative-motion") {
      score = 0.66;
    } else if (objective === "press-exit-switch" || objective === "level-clear") {
      score = 0.92;
    }

    const stability = clamp01(number(input.stableFrames) / 18);
    const phaseConfidence = clamp01(Math.max(
      number(input.firstDoorDoorConfidence),
      number(input.firstDoorCorridorConfidence),
      number(input.computerRoomConfidence),
      number(input.bridgeConfidence),
      number(input.finalRoomConfidence),
      input.hasControlPipeline ? 0.42 : 0));
    const milestoneBonus = input.milestoneReached ? 0.08 : 0;
    return clamp01(score * (0.72 + stability * 0.16 + phaseConfidence * 0.12) + milestoneBonus);
  }

  self.AIKernelDoomTopos = Object.freeze({
    composeDecisionCarrier,
    createDecisionCarrier,
    resolveEthosScore,
    resolveEthosVector,
    resolveKairos,
    resolveLogosVector,
    resolvePathosVector,
    normalizeVector,
    normalizeWeights
  });
})();
