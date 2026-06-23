(function () {
  "use strict";

  function number(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function normalizeAction(action = {}) {
    return {
      move: action.move || "none",
      turn: action.turn || "none",
      fire: Boolean(action.fire),
      strafe: Boolean(action.strafe),
      use: Boolean(action.use),
      run: Boolean(action.run)
    };
  }

  function normalizeTurn(value, fallback = "right") {
    return value === "left" || value === "right" || value === "none" ? value : fallback;
  }

  function planCentralHallEnemySweep(input = {}) {
    const targetTurn = normalizeTurn(input.targetTurn, "none");
    let sweepTurn = normalizeTurn(input.sweepTurn, "right");
    let sweepFrames = Math.max(0, number(input.sweepFrames));
    if (targetTurn === "left" || targetTurn === "right") {
      sweepTurn = targetTurn;
    } else if (sweepFrames <= 0) {
      sweepFrames = Math.max(36, Math.round(number(input.defaultSweepFrames, 72)));
      sweepTurn = sweepTurn === "left" ? "right" : "left";
    }

    const nextSweepFrames = Math.max(0, sweepFrames - 1);
    const depth = number(input.depth, 1);
    const motionStall = number(input.motionStallScore);
    const inputStallFrames = number(input.inputStallFrames);
    const openAdvance = depth >= 0.74 && motionStall < 0.58 && inputStallFrames < 3;
    const structuralDecoy = Boolean(input.enemyStructuralDecoy);
    const trustedEvidence = Boolean(input.trustedCombatEvidence)
      || number(input.trustedEnemyThreat) >= 0.26;
    const rawFrontConfidence = Math.max(
      number(input.targetConfidence),
      number(input.enemyConfidence),
      number(input.enemyCenterCellConfidence));
    const frontConfidence = structuralDecoy && !trustedEvidence
      ? Math.min(rawFrontConfidence, 0.10)
      : rawFrontConfidence;
    const centered = targetTurn === "none"
      || number(input.enemyCenterCellConfidence) >= 0.12
      || Math.abs(number(input.left) - number(input.right)) <= 22;
    const probeFire = !input.ammoLikelyEmpty
      && (!structuralDecoy || trustedEvidence)
      && centered
      && frontConfidence >= 0.18
      && number(input.fireCooldown) <= 0
      && (number(input.frameIndex) % 6) === 0;

    return {
      action: normalizeAction({
        move: probeFire ? "none" : (openAdvance && (nextSweepFrames % 18) < 6 ? "forward" : "none"),
        turn: probeFire ? "none" : sweepTurn,
        fire: probeFire,
        strafe: false,
        use: false,
        run: false
      }),
      frontConfidence,
      probeFire,
      sweepFrames: nextSweepFrames,
      sweepTurn,
      strategyPriority: 3,
      strategyContext: "central-hall-combat",
      controlPipeline: "ComputerRoom",
      safetyReason: "central-hall-front-enemy-sweep",
      mobilityMode: probeFire ? "central-hall-enemy-probe-fire" : `central-hall-enemy-sweep-${sweepTurn}`
    };
  }

  function inferPostEnemyObjective(input = {}) {
    if (!input.centralHallEntered || number(input.enemyDefeatedCount) <= 0) {
      if (input.enemyStructuralDecoy && !input.trustedCombatEvidence) {
        return input.bridgeLaneVisible ? "cross-bridge" : "secure-central-hall";
      }

      return "engage-front-enemy";
    }

    if (input.exitSwitchPressed) {
      return "level-clear";
    }

    if (input.finalRoomEntered) {
      return "press-exit-switch";
    }

    if (input.stairsEntered || number(input.doorOpenedCount) > 1) {
      return "reach-final-room";
    }

    return input.bridgeLaneVisible ? "cross-bridge" : "secure-central-hall";
  }

  self.AIKernelDoomCombatRoute = Object.freeze({
    inferPostEnemyObjective,
    planCentralHallEnemySweep,
    version: "20260619-combatroute1"
  });
})();
