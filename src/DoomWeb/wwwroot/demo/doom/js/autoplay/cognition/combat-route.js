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

  function finiteNumber(value) {
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }

  function resolveAimYaw(input = {}) {
    return finiteNumber(input.enemyCombatYaw)
      ?? finiteNumber(input.visualEnemyYaw)
      ?? finiteNumber(input.enemyYaw);
  }

  function turnFromYaw(yaw) {
    if (!Number.isFinite(yaw) || Math.abs(yaw) < 8) {
      return "none";
    }

    return yaw < 0 ? "left" : "right";
  }

  function planCentralHallEnemySweep(input = {}) {
    const targetTurn = normalizeTurn(input.targetTurn, "none");
    const frameIndex = Math.max(0, Math.round(number(input.frameIndex)));
    const centralHallFrames = Math.max(0, Math.round(number(input.centralHallFrames)));
    const combatFireFrames = Math.max(0, Math.round(number(input.combatFireFrames)));
    const openingBurstFrames = Math.max(24, Math.round(number(input.openingBurstFrames, 72)));
    const openingBurstShots = Math.max(3, Math.round(number(input.openingBurstShots, 5)));
    const aimYaw = resolveAimYaw(input);
    const aimYawAbs = aimYaw === null ? Number.POSITIVE_INFINITY : Math.abs(aimYaw);
    const yawCentered = aimYaw !== null && aimYawAbs <= 8;
    const yawNearCenter = aimYaw !== null && aimYawAbs <= 18;
    const yawTurn = turnFromYaw(aimYaw);
    let sweepTurn = normalizeTurn(input.sweepTurn, "right");
    let sweepFrames = Math.max(0, number(input.sweepFrames));
    if (yawTurn === "left" || yawTurn === "right") {
      sweepTurn = yawTurn;
    } else if (targetTurn === "left" || targetTurn === "right") {
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
    const centered = yawCentered
      || targetTurn === "none"
      || number(input.enemyCenterCellConfidence) >= 0.12
      || Math.abs(number(input.left) - number(input.right)) <= 22;
    const fineAimHold = yawNearCenter && !yawCentered && (frameIndex % 5) !== 0;
    const openingBurstActive = !input.ammoLikelyEmpty
      && !structuralDecoy
      && centralHallFrames > 0
      && centralHallFrames <= openingBurstFrames
      && combatFireFrames < openingBurstShots;
    const openingBurstFire = openingBurstActive
      && number(input.fireCooldown) <= 0
      && (frameIndex % 5) === 0;
    const probeFire = !input.ammoLikelyEmpty
      && (!structuralDecoy || trustedEvidence)
      && centered
      && frontConfidence >= 0.18
      && number(input.fireCooldown) <= 0
      && (frameIndex % 6) === 0;
    const fire = openingBurstFire || probeFire;
    const actionTurn = openingBurstActive || fire || yawCentered || fineAimHold ? "none" : sweepTurn;
    const aimHold = actionTurn === "none" && (openingBurstActive || (centered || yawNearCenter) && frontConfidence >= 0.16);

    return {
      action: normalizeAction({
        move: fire || aimHold ? "none" : (openAdvance && (nextSweepFrames % 18) < 6 ? "forward" : "none"),
        turn: actionTurn,
        fire,
        strafe: false,
        use: false,
        run: false
      }),
      frontConfidence,
      probeFire: fire,
      sweepFrames: nextSweepFrames,
      sweepTurn,
      strategyPriority: 3,
      strategyContext: "central-hall-combat",
      controlPipeline: "ComputerRoom",
      safetyReason: "central-hall-front-enemy-sweep",
      mobilityMode: probeFire
        ? "central-hall-enemy-probe-fire"
        : (openingBurstFire
          ? "central-hall-opening-burst-fire"
          : (aimHold ? "central-hall-enemy-aim-hold" : `central-hall-enemy-sweep-${sweepTurn}`))
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
