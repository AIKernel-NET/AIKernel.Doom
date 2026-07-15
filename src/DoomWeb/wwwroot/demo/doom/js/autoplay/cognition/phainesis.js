(function () {
  "use strict";

  const LOOMING_DELTA_THRESHOLD = 0.18;
  const DAMAGE_AUDIO_BALANCE_THRESHOLD = 0.18;
  const TRAP_AUDIO_ENERGY_THRESHOLD = 0.54;
  const SPATIAL_ENTROPY_REPEAT_THRESHOLD = 5;
  const HIGH_AUDIO_BAND_THRESHOLD = 0.42;
  const COMBAT_FACE_DANGER_DELTA = 0.32;
  const KINESIS_STUCK_REPEAT_FRAMES = 18;
  const KINESIS_STUCK_HISTORY_FRAMES = 6;
  const ENEMY_AUDIO_MIN_ENERGY = 0.08;
  const EVENT_SCORE_NAMES = [
    "wallFlow",
    "corridorFlow",
    "gap",
    "stuck",
    "oscillation",
    "looming",
    "enemyPresence",
    "damageLocalization",
    "projectileFlow",
    "threatField",
    "explorationEntropy",
    "itemBacktrack",
    "goalDirection",
    "safeZone",
    "intentConsistency",
    "movementStability",
    "confidenceFusion"
  ];

  function createEventScores(overrides = {}) {
    const scores = {};
    for (let index = 0; index < EVENT_SCORE_NAMES.length; index += 1) {
      const name = EVENT_SCORE_NAMES[index];
      scores[name] = clamp01(overrides[name]);
    }

    return scores;
  }

  function createPhainomenon(overrides = {}) {
    return {
      wallFlow: Object.assign({ active: false, direction: null, strength: 0 }, overrides.wallFlow || {}),
      corridorFlow: Object.assign({ active: false, direction: null, score: 0 }, overrides.corridorFlow || {}),
      gap: Object.assign({ active: false, direction: null, score: 0 }, overrides.gap || {}),
      looming: Object.assign({ active: false, direction: null }, overrides.looming || {}),
      damageLocalization: Object.assign({ active: false, direction: null }, overrides.damageLocalization || {}),
      trap: Object.assign({ active: false, kind: null }, overrides.trap || {}),
      stuck: Object.assign({ active: false, evidence: null }, overrides.stuck || {}),
      oscillation: Object.assign({ active: false, strength: 0 }, overrides.oscillation || {}),
      enemyPresence: Object.assign({ active: false, direction: null, probability: 0 }, overrides.enemyPresence || {}),
      projectileFlow: Object.assign({ active: false, direction: null, strength: 0 }, overrides.projectileFlow || {}),
      threatField: Object.assign({ active: false, direction: null, score: 0, left: 0, right: 0, front: 0 }, overrides.threatField || {}),
      explorationEntropy: Object.assign({ high: false }, overrides.explorationEntropy || {}),
      itemBacktrack: Object.assign({ suggested: false, targetKind: null }, overrides.itemBacktrack || {}),
      goalDirection: Object.assign({ active: false, direction: null, score: 0 }, overrides.goalDirection || {}),
      safeZone: Object.assign({ active: false, direction: null, score: 0 }, overrides.safeZone || {}),
      intentConsistency: Object.assign({ active: false, score: 0 }, overrides.intentConsistency || {}),
      movementStability: Object.assign({ active: false, score: 0 }, overrides.movementStability || {}),
      confidenceFusion: Object.assign({ active: false, score: 0 }, overrides.confidenceFusion || {}),
      sensorRecovery: Object.assign({ needed: false, reason: null }, overrides.sensorRecovery || {}),
      eventScores: createEventScores(overrides.eventScores)
    };
  }

  function evaluatePhainomenon(input = {}) {
    const frames = Array.isArray(input.frames) ? input.frames : [];
    const latest = input.latest || (frames.length > 0 ? frames[frames.length - 1] : {});
    const previous = input.previous || (frames.length > 1 ? frames[frames.length - 2] : {});
    const result = createPhainomenon();
    const demoRouteGraceActive = Boolean(input.demoRouteGraceActive);
    const wallFlow = detectWallFlow(latest, previous, frames);
    const corridorFlow = detectCorridorFlow(latest);
    const gap = detectGap(latest);
    let looming = detectLooming(latest, previous, frames);
    const damageLocalization = detectDamageLocalization(latest, previous, frames);
    const trap = detectTrap(latest, frames, input.spatialHistory);
    let stuck = detectStuck(input.nousCarrier, latest, frames);
    const oscillation = detectOscillation(latest, frames);
    const enemyPresence = detectEnemyPresence(latest, frames);
    const projectileFlow = detectProjectileFlow(latest);
    let threatField = detectThreatField(latest, {
      looming,
      damageLocalization,
      enemyPresence,
      projectileFlow
    });
    const explorationEntropy = detectExplorationEntropy(latest, frames);
    const itemBacktrack = detectItemBacktrack(input.itemMemory, latest);
    const goalDirection = detectGoalDirection(latest);
    const safeZone = detectSafeZone(latest, threatField, explorationEntropy);
    const intentConsistency = detectIntentConsistency(latest, frames);
    const movementStability = detectMovementStability(latest, stuck, oscillation);
    const confidenceFusion = detectConfidenceFusion(latest, {
      wallFlow,
      corridorFlow,
      gap,
      looming,
      damageLocalization,
      stuck,
      oscillation,
      enemyPresence,
      projectileFlow,
      threatField,
      explorationEntropy,
      itemBacktrack,
      goalDirection,
      safeZone,
      intentConsistency,
      movementStability
    });
    if (input.preDoorNoCombat && looming.active) {
      looming = { active: false, direction: null };
      threatField = detectThreatField(latest, {
        looming,
        damageLocalization,
        enemyPresence: { active: false, direction: null, probability: 0 },
        projectileFlow
      });
    }

    if (demoRouteGraceActive && stuck.active) {
      stuck = { active: false, evidence: null };
    }

    const movementStallEvent = !demoRouteGraceActive
      && input.movementEventType === "movement-stall"
      && Number(input.movementConfidence || 0) >= 0.74
      && (Number(latest.stuckFrames || 0) >= 2
        || Number(latest.inputStallFrames || 0) >= 4
        || (countRecentLowMotion(frames, 8) >= 6 && Number(latest.temporalDelta || 0) <= 0.06));
    const recoveryReason = stuck.active
      ? "intent-result-mismatch"
      : (movementStallEvent ? "movement-stall" : null);

    result.looming = looming;
    result.wallFlow = wallFlow;
    result.corridorFlow = corridorFlow;
    result.gap = gap;
    result.damageLocalization = damageLocalization;
    result.trap = trap;
    result.stuck = stuck;
    result.oscillation = oscillation;
    result.enemyPresence = enemyPresence;
    result.projectileFlow = projectileFlow;
    result.threatField = threatField;
    result.explorationEntropy = explorationEntropy;
    result.itemBacktrack = itemBacktrack;
    result.goalDirection = goalDirection;
    result.safeZone = safeZone;
    result.intentConsistency = intentConsistency;
    result.movementStability = movementStability;
    result.confidenceFusion = confidenceFusion;
    result.sensorRecovery = {
      needed: Boolean(recoveryReason),
      reason: recoveryReason
    };
    result.eventScores = createEventScores({
      wallFlow: wallFlow.strength,
      corridorFlow: corridorFlow.score,
      gap: gap.score,
      stuck: stuck.active ? 1 : 0,
      oscillation: oscillation.strength,
      looming: looming.active ? Math.max(Number(latest.projectileScore || 0), Number(projectileFlow.strength || 0)) : 0,
      enemyPresence: enemyPresence.probability,
      damageLocalization: damageLocalization.active ? 1 : 0,
      projectileFlow: projectileFlow.strength,
      threatField: threatField.score,
      explorationEntropy: explorationEntropy.high ? 1 : 0,
      itemBacktrack: itemBacktrack.suggested ? 1 : 0,
      goalDirection: goalDirection.score,
      safeZone: safeZone.score,
      intentConsistency: intentConsistency.score,
      movementStability: movementStability.score,
      confidenceFusion: confidenceFusion.score
    });
    return result;
  }

  function activePhainesisEvents(input = {}) {
    const phainomenon = input.phainomenon || input.detector || createPhainomenon();
    const detections = [];
    const doorTransitionGraceActive = Boolean(input.doorTransitionGraceActive);

    if (input.healthRetry) {
      detections.push("health-retry");
    }

    if (input.visualEventDetected) {
      detections.push("visual-attention");
    }

    if (input.audioEventDetected) {
      detections.push("audio-event");
    }

    if (input.movementEventDetected) {
      const movementEvent = input.movementEventType || "movement";
      if (movementEvent === "movement-stall") {
        if (!doorTransitionGraceActive && (phainomenon.stuck?.active || phainomenon.sensorRecovery?.needed)) {
          detections.push("movement-stall");
        }
      } else if (movementEvent !== "movement") {
        detections.push(movementEvent);
      }
    }

    if (input.spatialEventDetected) {
      detections.push("spatial-event");
    }

    if (phainomenon.wallFlow?.active) {
      detections.push("wall-flow");
    }

    if (phainomenon.corridorFlow?.active) {
      detections.push("corridor-flow");
    }

    if (phainomenon.gap?.active) {
      detections.push("gap");
    }

    if (phainomenon.looming?.active) {
      detections.push("looming");
    }

    if (phainomenon.damageLocalization?.active) {
      detections.push("damage-localization");
    }

    if (phainomenon.trap?.active) {
      detections.push("trap");
    }

    if (!doorTransitionGraceActive && phainomenon.stuck?.active) {
      detections.push("stuck");
    }

    if (!doorTransitionGraceActive && phainomenon.oscillation?.active) {
      detections.push("oscillation");
    }

    if (phainomenon.enemyPresence?.active) {
      detections.push("enemy-presence");
    }

    if (phainomenon.projectileFlow?.active) {
      detections.push("projectile-flow");
    }

    if (phainomenon.threatField?.active) {
      detections.push("threat-field");
    }

    if (phainomenon.explorationEntropy?.high) {
      detections.push("exploration-entropy");
    }

    if (phainomenon.itemBacktrack?.suggested) {
      detections.push("item-backtrack");
    }

    if (phainomenon.goalDirection?.active) {
      detections.push("goal-direction");
    }

    if (phainomenon.safeZone?.active) {
      detections.push("safe-zone");
    }

    if (phainomenon.intentConsistency?.active && Number(phainomenon.intentConsistency.score || 0) < 0.34) {
      detections.push("intent-inconsistent");
    }

    if (phainomenon.movementStability?.active && Number(phainomenon.movementStability.score || 0) < 0.34) {
      detections.push("movement-unstable");
    }

    if (phainomenon.confidenceFusion?.active && Number(phainomenon.confidenceFusion.score || 0) < 0.34) {
      detections.push("confidence-low");
    }

    if (!doorTransitionGraceActive && phainomenon.sensorRecovery?.needed) {
      detections.push("sensor-recovery");
    }

    return detections;
  }

  function detectWallFlow(latest, previous, frames) {
    const flowX = Number(latest.flowX || 0);
    const flowY = Number(latest.flowY || 0);
    const previousFlowX = Number(previous.flowX || 0);
    const depth = clamp01(Number(latest.depthEstimate ?? 1));
    const closeWall = clamp01(1 - depth);
    const temporal = clamp01(Number(latest.temporalDelta || 0));
    const narrowness = clamp01(Number(latest.narrowness || 0));
    const horizontal = Math.abs(flowX);
    const flowContinuity = sameSignRatio(frames, "flowX", 6);
    const strength = clamp01((horizontal * 0.46)
      + (Math.abs(flowX - previousFlowX) * 0.12)
      + (closeWall * 0.18)
      + (temporal * 0.12)
      + (narrowness * 0.08)
      + (flowContinuity * 0.04));
    const active = strength >= 0.18 && horizontal >= Math.max(0.045, Math.abs(flowY) * 0.55);
    return {
      active,
      direction: active ? (flowX > 0 ? "right" : "left") : null,
      strength: round2(strength)
    };
  }

  function detectCorridorFlow(latest) {
    const depth = clamp01(Number(latest.depthEstimate ?? 1));
    const gapScore = clamp01(Number(latest.spawnCorridorGapScore || 0));
    const landmark = clamp01(Number(latest.spawnLandmarkRouteEvidence || 0));
    const narrowness = clamp01(Number(latest.narrowness || 0));
    const score = clamp01((gapScore * 0.52) + (landmark * 0.2) + (depth * 0.18) + ((1 - narrowness) * 0.1));
    return {
      active: score >= 0.22,
      direction: score >= 0.22 ? (latest.baseDirection || flowDirection(latest.flowX, latest.flowY) || "front") : null,
      score: round2(score)
    };
  }

  function detectGap(latest) {
    const gapScore = clamp01(Number(latest.spawnCorridorGapScore || 0));
    const depth = clamp01(Number(latest.depthEstimate ?? 1));
    const flowHint = flowDirection(latest.flowX, latest.flowY);
    const score = clamp01(Math.max(gapScore, depth >= 0.74 ? 0.18 : 0, Math.abs(Number(latest.flowX || 0)) * 0.55));
    return {
      active: score >= 0.2,
      direction: score >= 0.2 ? (latest.baseDirection || flowHint || "front") : null,
      score: round2(score)
    };
  }

  function detectLooming(latest, previous, frames) {
    const current = Number(latest.projectileScore || 0);
    let baseline = Number(previous.projectileScore || 0);
    let recentMin = current;
    let risingFrames = 0;
    const start = Math.max(0, frames.length - 5);
    for (let index = start; index < frames.length - 1; index += 1) {
      const score = Number(frames[index].projectileScore || 0);
      baseline = Math.max(baseline, score);
      recentMin = Math.min(recentMin, score);
      if (index > start && score > Number(frames[index - 1]?.projectileScore || 0) + 0.025) {
        risingFrames += 1;
      }
    }

    const growth = current - baseline;
    const trendGrowth = current - recentMin;
    const dynamicSignal = Math.max(Number(latest.dynamicObjectScore || 0), Number(latest.temporalDelta || 0));
    const flowMagnitude = Math.max(Math.abs(Number(latest.flowX || 0)), Math.abs(Number(latest.flowY || 0)));
    const notAdvancing = Number(latest.motorForward || 0) <= 0.12;
    const stableThreat = current >= 0.2 && trendGrowth >= 0.1 && risingFrames >= 2;
    const active = notAdvancing
      && current >= 0.16
      && (growth >= LOOMING_DELTA_THRESHOLD
        || stableThreat
        || (current >= 0.28 && growth >= 0.08)
        || (current >= 0.22 && dynamicSignal >= 0.08 && flowMagnitude >= 0.12));
    return {
      active,
      direction: active ? (latest.projectileDirection || flowDirection(latest.flowX, latest.flowY) || latest.baseDirection) : null
    };
  }

  function detectOscillation(latest, frames) {
    const flowChanges = signChanges(frames, "flowX", 8);
    const motorChanges = signChanges(frames, "motorForward", 8);
    const stall = Math.max(Number(latest.stuckFrames || 0), Number(latest.inputStallFrames || 0));
    const strength = clamp01((flowChanges / 5) + (motorChanges / 6) + Math.min(0.28, stall / 18));
    return {
      active: strength >= 0.42,
      strength: round2(strength)
    };
  }

  function detectEnemyPresence(latest, frames) {
    const rawVisual = clamp01(Number(latest.enemyConfidence || 0));
    const trusted = clamp01(Number(latest.trustedEnemyThreat || 0));
    const trustedEvidence = Boolean(latest.trustedCombatEvidence) || trusted >= 0.26;
    const audio = detectAuditoryEnemyPresence(latest, frames);
    const terminalSurface = Math.max(
      Number(latest.computerPanelScore || 0),
      Number(latest.computerDarkPanelScore || 0),
      Number(latest.computerRoomScore || 0) * 0.72);
    const sideAudio = audio.probability >= 0.24 && audio.direction && audio.direction !== "front";
    const terminalVisualDecoy = terminalSurface >= 0.24
      && rawVisual <= 0.46
      && trusted < 0.28
      && (sideAudio || Number(latest.computerRoomScore || 0) >= 0.18);
    const visualBase = trustedEvidence ? Math.max(rawVisual, trusted) : Math.min(rawVisual, 0.12);
    const visual = terminalVisualDecoy ? Math.min(visualBase, 0.10) : visualBase;
    const recent = trustedEvidence ? recentMax(frames, "trustedEnemyThreat", 6) * 0.24 : 0;
    const probability = clamp01(Math.max(visual, audio.probability, visual * 0.72 + (audio.probability * 0.48) + recent));
    const visualDirection = latest.baseDirection || latest.projectileDirection || null;
    const direction = probability >= 0.28
      ? (visual >= 0.28 && !terminalVisualDecoy ? visualDirection : (audio.direction || visualDirection))
      : null;
    return {
      active: probability >= 0.28,
      direction,
      probability: round2(probability),
      audioProbability: round2(audio.probability),
      visualSuppressed: terminalVisualDecoy,
      source: terminalVisualDecoy && audio.probability > 0
        ? "audio-terminal-mask"
        : (audio.probability > visual ? "audio" : (trustedEvidence ? "trusted-visual" : "visual"))
    };
  }

  function detectAuditoryEnemyPresence(latest, frames) {
    const eventType = normalizeAudioEventType(latest.audioEventType);
    if (isDoorUseAudioEvent(eventType)) {
      return { probability: 0, direction: null };
    }

    const totalEnergy = Math.max(
      Number(latest.audioEnergy || 0),
      Number(latest.audioLowEnergy || 0),
      Number(latest.audioMidEnergy || 0),
      Number(latest.audioHighEnergy || 0));
    const midHigh = Math.max(Number(latest.audioMidEnergy || 0), Number(latest.audioHighEnergy || 0));
    const lowThreat = Number(latest.audioLowEnergy || 0) * 0.54;
    const eventDetected = Boolean(latest.audioEventDetected);
    const eventLikelyCombat = eventType === "native-sfx"
      || eventType === "doom-native-sfx"
      || eventType === "spatial-event"
      || eventType === "attention"
      || eventType === "contact";
    const postDoorContext = Number(latest.computerRoomScore || 0) >= 0.12
      || Number(latest.bridgeDoorScore || 0) >= 0.12
      || Number(latest.trustedEnemyThreat || 0) >= 0.18;
    if (totalEnergy < ENEMY_AUDIO_MIN_ENERGY && !(eventDetected && eventLikelyCombat && totalEnergy >= 0.035 && postDoorContext)) {
      return { probability: 0, direction: null };
    }

    const weightedBalance = weightedAudioBalance(frames, 8);
    const balance = Math.abs(weightedBalance) >= 0.08
      ? weightedBalance
      : clampSigned(Number(latest.audioBalance || 0));
    const sideConfidence = clamp01(0.45 + Math.min(0.42, Math.abs(balance) * 0.86));
    const bandThreat = clamp01(Math.max(midHigh * 0.94, lowThreat, totalEnergy * 0.72));
    const eventBonus = eventDetected && eventLikelyCombat ? 0.14 : 0;
    const contextBonus = postDoorContext ? 0.08 : 0;
    const probability = clamp01((bandThreat * sideConfidence) + eventBonus + contextBonus);
    return {
      probability,
      direction: audioDirection(balance, probability)
    };
  }

  function detectProjectileFlow(latest) {
    const projectile = clamp01(Number(latest.projectileScore || 0));
    const dynamic = clamp01(Number(latest.dynamicObjectScore || 0));
    const flow = clamp01(Math.max(Math.abs(Number(latest.flowX || 0)), Math.abs(Number(latest.flowY || 0))));
    const strength = clamp01(Math.max(projectile, projectile * 0.72 + dynamic * 0.2 + flow * 0.08));
    return {
      active: strength >= 0.16 && projectile >= 0.1,
      direction: strength >= 0.16 ? (latest.projectileDirection || flowDirection(latest.flowX, latest.flowY) || latest.baseDirection) : null,
      strength: round2(strength)
    };
  }

  function detectThreatField(latest, events) {
    const enemy = Number(events.enemyPresence?.probability || 0);
    const projectile = Number(events.projectileFlow?.strength || 0);
    const looming = events.looming?.active ? Math.max(0.28, Number(latest.projectileScore || 0)) : 0;
    const damage = events.damageLocalization?.active ? 0.75 : 0;
    const score = clamp01(Math.max(enemy, projectile, looming, damage));
    const direction = events.damageLocalization?.direction
      || events.projectileFlow?.direction
      || events.looming?.direction
      || events.enemyPresence?.direction
      || null;
    return {
      active: score >= 0.24,
      direction,
      score: round2(score),
      left: round2(direction === "left" ? score : score * Math.max(0, -Number(latest.audioBalance || 0)) * 0.5),
      right: round2(direction === "right" ? score : score * Math.max(0, Number(latest.audioBalance || 0)) * 0.5),
      front: round2(direction === "left" || direction === "right" ? score * 0.55 : score)
    };
  }

  function detectDamageLocalization(latest, previous, frames) {
    const healthDrop = Number(previous.healthActiveCells || 0) - Number(latest.healthActiveCells || 0);
    const zeroRise = Number(latest.healthZeroScore || 0) - Number(previous.healthZeroScore || 0);
    const faceShock = Number(latest.faceDelta || 0) >= COMBAT_FACE_DANGER_DELTA;
    const blind = Number(latest.trustedEnemyThreat || 0) < 0.28 && Number(latest.projectileScore || 0) < 0.12;
    const balance = weightedAudioBalance(frames, 8);
    const audioEvidence = Math.max(Number(latest.audioEnergy || 0), Number(latest.audioMidEnergy || 0), Number(latest.audioHighEnergy || 0));
    const recentHealthShock = countRecentHealthShock(frames, 8) >= 1;
    const active = blind
      && Math.abs(balance) >= DAMAGE_AUDIO_BALANCE_THRESHOLD
      && audioEvidence >= 0.1
      && (healthDrop >= 2 || zeroRise >= 0.12 || faceShock || recentHealthShock);
    return {
      active,
      direction: active ? (balance > 0 ? "right" : "left") : null
    };
  }

  function detectTrap(latest, frames, spatialHistory) {
    const audioBursts = countRecentAudioBursts(frames, 8);
    const spatialEvents = countRecentSpatialEvents(spatialHistory, 6);
    const narrow = Number(latest.narrowness || 0) >= 0.62;
    const highBandBurst = Number(latest.audioHighEnergy || 0) >= HIGH_AUDIO_BAND_THRESHOLD;
    const active = narrow
      && (Number(latest.audioEnergy || 0) >= TRAP_AUDIO_ENERGY_THRESHOLD || highBandBurst || audioBursts >= 2)
      && (spatialEvents >= 1 || Number(latest.spatialConfidence || 0) >= 0.32);
    return {
      active,
      kind: active ? "narrow-audio-burst" : null
    };
  }

  function detectStuck(nousCarrier, latest, frames) {
    const movement = nousCarrier?.movementEnvelope || {};
    const wantsForward = movement.y === "positive" || Number(latest.motorForward || 0) > 0.55;
    const movementSpeed = Number(latest.movementSpeed || 0);
    const forwardProgress = Number(latest.motionForwardProgress ?? movementSpeed);
    const lowMotion = Math.max(movementSpeed, forwardProgress) <= 0.14;
    const repeatedLowMotion = countRecentLowMotion(frames, 6) >= 4;
    const repeatedView = countRecentBaseSignature(frames, latest.base3x3Signature, 10) >= 5;
    const repeatedDepth = countRecentDepthSignature(frames, latest.depthSignature, 10) >= 5;
    const visualStill = Number(latest.temporalDelta || 0) <= 0.05 && Math.max(Math.abs(Number(latest.flowX || 0)), Math.abs(Number(latest.flowY || 0))) <= 0.08;
    const counterBlocked = Number(latest.stuckFrames || 0) >= 2 || Number(latest.inputStallFrames || 0) >= 3;
    const footBlocked = Number(latest.footObstacleBounceFrames || 0) >= 2 && Number(latest.footObstacleFlickerScore || 0) >= 0.18;
    const repeatedActionFrames = Number(latest.actionRepeatFrames || 0);
    const actionTrackable = isTrackableKinesisSignature(latest.actionSignature);
    const repeatedActionHistory = actionTrackable ? countRecentActionSignature(frames, latest.actionSignature, 8) : 0;
    const kinesisLoop = actionTrackable && (repeatedActionFrames >= KINESIS_STUCK_REPEAT_FRAMES || repeatedActionHistory >= KINESIS_STUCK_HISTORY_FRAMES);
    const persistentLowMotion = countRecentLowMotion(frames, 8) >= 6;
    const environmentStill = repeatedView || repeatedDepth || visualStill;
    const collisionStill = counterBlocked && (environmentStill || footBlocked);
    const active = wantsForward
      && lowMotion
      && ((kinesisLoop && (persistentLowMotion || environmentStill || footBlocked))
        || (collisionStill && (persistentLowMotion || kinesisLoop))
        || (persistentLowMotion && environmentStill && repeatedLowMotion));
    return {
      active,
      evidence: active
        ? (kinesisLoop ? "kinesis-repeat" : (collisionStill ? "input-stall" : (repeatedDepth ? "depth-repeat" : (repeatedView ? "view-repeat" : "low-motion"))))
        : null
    };
  }

  function detectExplorationEntropy(latest, frames) {
    const repeatCount = countRecentBaseSignature(frames, latest.base3x3Signature, 12);
    const noThreat = Number(latest.trustedEnemyThreat || 0) < 0.24
      && Number(latest.projectileScore || 0) < 0.12
      && Number(latest.audioEnergy || 0) < 0.38
      && Number(latest.audioHighEnergy || 0) < 0.24;
    const notDead = Number(latest.healthZeroScore || 0) < 0.78;
    const lowMotion = Number(latest.movementSpeed || 0) <= 0.22;
    return {
      high: notDead && noThreat && lowMotion && repeatCount >= SPATIAL_ENTROPY_REPEAT_THRESHOLD
    };
  }

  function detectItemBacktrack(itemMemory, latest) {
    const memory = Array.isArray(itemMemory) ? itemMemory : [];
    const lowHealth = Number(latest.healthActiveCells || 0) > 0
      && (Number(latest.healthActiveCells || 0) <= 9 || Number(latest.healthZeroScore || 0) >= 0.42);
    const calm = Number(latest.trustedEnemyThreat || 0) < 0.34
      && Number(latest.projectileScore || 0) < 0.16
      && Number(latest.audioEnergy || 0) < 0.5;
    const suggested = lowHealth && calm && memory.length > 0;
    return {
      suggested,
      targetKind: suggested ? (memory[memory.length - 1].targetKind || "resource") : null
    };
  }

  function detectGoalDirection(latest) {
    const firstDoor = Math.max(Number(latest.firstDoorVision9x9Score || 0), Number(latest.firstDoorUse3x3Score || 0));
    const routeGap = Number(latest.spawnCorridorGapScore || 0);
    const landmark = Number(latest.spawnLandmarkRouteEvidence || 0);
    const room = Math.max(Number(latest.computerRoomScore || 0), Number(latest.bridgeDoorScore || 0));
    const score = clamp01(Math.max(firstDoor, routeGap * 0.82, landmark, room));
    return {
      active: score >= 0.22,
      direction: score >= 0.22
        ? (firstDoor >= 0.28 || room >= 0.24 ? "front" : (latest.baseDirection || flowDirection(latest.flowX, latest.flowY) || "front"))
        : null,
      score: round2(score)
    };
  }

  function detectSafeZone(latest, threatField, explorationEntropy) {
    const depth = clamp01(Number(latest.depthEstimate ?? 1));
    const threat = clamp01(Number(threatField?.score || 0));
    const openSpace = Math.max(depth, Number(latest.spawnCorridorGapScore || 0), Number(latest.spatialConfidence || 0) * 0.6);
    const entropyPenalty = explorationEntropy?.high ? 0.12 : 0;
    const score = clamp01((openSpace * (1 - threat)) - entropyPenalty);
    return {
      active: score >= 0.34,
      direction: score >= 0.34 ? oppositeDirection(threatField?.direction) || latest.baseDirection || "front" : null,
      score: round2(score)
    };
  }

  function detectIntentConsistency(latest, frames) {
    const forwardIntent = Math.max(0, Number(latest.motorForward || 0));
    const motion = clamp01(Number(latest.movementSpeed || 0));
    const flow = clamp01(Math.max(Math.abs(Number(latest.flowX || 0)), Math.abs(Number(latest.flowY || 0))));
    const repeatedLowMotion = countRecentLowMotion(frames, 8) >= 5;
    const score = forwardIntent > 0.2
      ? clamp01((motion * 0.72) + (flow * 0.16) + (repeatedLowMotion ? 0 : 0.12))
      : clamp01(0.62 + (motion * 0.18));
    return {
      active: score <= 0.48 || score >= 0.72,
      score: round2(score)
    };
  }

  function detectMovementStability(latest, stuck, oscillation) {
    const stall = stuck?.active ? 0.45 : 0;
    const oscillationPenalty = Number(oscillation?.strength || 0) * 0.34;
    const temporalPenalty = Math.min(0.24, Number(latest.temporalDelta || 0) * 0.34);
    const score = clamp01(1 - stall - oscillationPenalty - temporalPenalty);
    return {
      active: score <= 0.48 || score >= 0.72,
      score: round2(score)
    };
  }

  function detectConfidenceFusion(latest, events) {
    const stability = Number(events.movementStability?.score || 0);
    const spatial = clamp01(Number(latest.spatialConfidence || 0));
    const goal = Number(events.goalDirection?.score || 0);
    const safe = Number(events.safeZone?.score || 0);
    const wall = Number(events.wallFlow?.strength || 0);
    const threat = Number(events.threatField?.score || 0);
    const signal = Math.max(goal, safe, wall, threat, spatial);
    const score = clamp01((stability * 0.36) + (spatial * 0.22) + (signal * 0.42));
    return {
      active: score <= 0.36 || score >= 0.58,
      score: round2(score)
    };
  }

  function countRecentBaseSignature(frames, signature, limit) {
    if (!signature || !Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (frames[index]?.base3x3Signature === signature) {
        count += 1;
      }
    }

    return count;
  }

  function countRecentLowMotion(frames, limit) {
    if (!Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (Number(frames[index]?.movementSpeed || 0) <= 0.14) {
        count += 1;
      }
    }

    return count;
  }

  function countRecentDepthSignature(frames, signature, limit) {
    if (!signature || !Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (frames[index]?.depthSignature === signature) {
        count += 1;
      }
    }

    return count;
  }

  function countRecentActionSignature(frames, signature, limit) {
    if (!signature || !Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (frames[index]?.actionSignature === signature) {
        count += 1;
      }
    }

    return count;
  }

  function isTrackableKinesisSignature(signature) {
    const parts = String(signature || "").split(":");
    if (parts.length < 6) {
      return false;
    }

    const move = parts[0];
    const turn = parts[1];
    const fire = parts[2] === "f";
    const strafe = parts[3] === "s";
    const use = parts[4] === "u";
    const run = parts[5] === "r";
    return !fire && !use && (move !== "none" || turn !== "none" || strafe || run);
  }

  function countRecentAudioBursts(frames, limit) {
    if (!Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (Number(frames[index]?.audioEnergy || 0) >= TRAP_AUDIO_ENERGY_THRESHOLD
        || Number(frames[index]?.audioHighEnergy || 0) >= HIGH_AUDIO_BAND_THRESHOLD) {
        count += 1;
      }
    }

    return count;
  }

  function countRecentHealthShock(frames, limit) {
    if (!Array.isArray(frames) || frames.length <= 1) {
      return 0;
    }

    let count = 0;
    const start = Math.max(1, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      const previous = frames[index - 1] || {};
      const current = frames[index] || {};
      const healthDrop = Number(previous.healthActiveCells || 0) - Number(current.healthActiveCells || 0);
      const zeroRise = Number(current.healthZeroScore || 0) - Number(previous.healthZeroScore || 0);
      if (healthDrop >= 2 || zeroRise >= 0.12 || Number(current.faceDelta || 0) >= COMBAT_FACE_DANGER_DELTA) {
        count += 1;
      }
    }

    return count;
  }

  function countRecentSpatialEvents(spatialHistory, limit) {
    if (!Array.isArray(spatialHistory)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, spatialHistory.length - limit);
    for (let index = start; index < spatialHistory.length; index += 1) {
      if (spatialHistory[index]?.eventDetected) {
        count += 1;
      }
    }

    return count;
  }

  function signChanges(frames, key, limit) {
    if (!Array.isArray(frames) || frames.length <= 1) {
      return 0;
    }

    let changes = 0;
    let previousSign = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      const value = Number(frames[index]?.[key] || 0);
      const sign = Math.abs(value) <= 0.04 ? 0 : (value > 0 ? 1 : -1);
      if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
        changes += 1;
      }

      if (sign !== 0) {
        previousSign = sign;
      }
    }

    return changes;
  }

  function sameSignRatio(frames, key, limit) {
    if (!Array.isArray(frames) || frames.length === 0) {
      return 0;
    }

    let positive = 0;
    let negative = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      const value = Number(frames[index]?.[key] || 0);
      if (value > 0.04) {
        positive += 1;
      } else if (value < -0.04) {
        negative += 1;
      }
    }

    const total = positive + negative;
    return total > 0 ? Math.max(positive, negative) / total : 0;
  }

  function recentMax(frames, key, limit) {
    if (!Array.isArray(frames)) {
      return 0;
    }

    let max = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      max = Math.max(max, clamp01(Number(frames[index]?.[key] || 0)));
    }

    return max;
  }

  function averageAudioBalance(frames, limit) {
    if (!Array.isArray(frames) || frames.length === 0) {
      return 0;
    }

    let total = 0;
    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      total += Number(frames[index]?.audioBalance || 0);
      count += 1;
    }

    return count > 0 ? clampSigned(total / count) : 0;
  }

  function weightedAudioBalance(frames, limit) {
    if (!Array.isArray(frames) || frames.length === 0) {
      return 0;
    }

    let total = 0;
    let weightTotal = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      const frame = frames[index] || {};
      const energy = Math.max(Number(frame.audioEnergy || 0), Number(frame.audioMidEnergy || 0), Number(frame.audioHighEnergy || 0));
      const weight = Math.max(0.001, energy);
      total += Number(frame.audioBalance || 0) * weight;
      weightTotal += weight;
    }

    return weightTotal > 0 ? clampSigned(total / weightTotal) : averageAudioBalance(frames, limit);
  }

  function flowDirection(flowX, flowY) {
    const x = Number(flowX || 0);
    const y = Number(flowY || 0);
    if (Math.abs(x) >= Math.max(0.08, Math.abs(y) * 0.75)) {
      return x > 0 ? "right" : "left";
    }

    return null;
  }

  function oppositeDirection(direction) {
    if (direction === "left") {
      return "right";
    }

    if (direction === "right") {
      return "left";
    }

    if (direction === "front") {
      return "behind";
    }

    return null;
  }

  function normalizeAudioEventType(value) {
    return String(value || "none").trim().toLowerCase();
  }

  function isDoorUseAudioEvent(eventType) {
    return eventType === "use-success-gate"
      || eventType === "use-failed-voice"
      || eventType === "use-response";
  }

  function audioDirection(balance, probability) {
    const value = Number(balance || 0);
    if (value > 0.12) {
      return "right";
    }

    if (value < -0.12) {
      return "left";
    }

    return Number(probability || 0) >= 0.36 ? "front" : null;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  function clampSigned(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(-1, Math.min(1, number));
  }

  self.AIKernelDoomPhainesis = Object.freeze({
    createPhainomenon,
    evaluatePhainomenon,
    activePhainesisEvents
  });
})();
