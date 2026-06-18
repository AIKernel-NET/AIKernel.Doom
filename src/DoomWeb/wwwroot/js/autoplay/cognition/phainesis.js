(function () {
  "use strict";

  const LOOMING_DELTA_THRESHOLD = 0.18;
  const DAMAGE_AUDIO_BALANCE_THRESHOLD = 0.18;
  const TRAP_AUDIO_ENERGY_THRESHOLD = 0.54;
  const SPATIAL_ENTROPY_REPEAT_THRESHOLD = 5;
  const HIGH_AUDIO_BAND_THRESHOLD = 0.42;
  const COMBAT_FACE_DANGER_DELTA = 0.32;

  function createPhainomenon(overrides = {}) {
    return {
      looming: Object.assign({ active: false, direction: null }, overrides.looming || {}),
      damageLocalization: Object.assign({ active: false, direction: null }, overrides.damageLocalization || {}),
      trap: Object.assign({ active: false, kind: null }, overrides.trap || {}),
      stuck: Object.assign({ active: false, evidence: null }, overrides.stuck || {}),
      explorationEntropy: Object.assign({ high: false }, overrides.explorationEntropy || {}),
      itemBacktrack: Object.assign({ suggested: false, targetKind: null }, overrides.itemBacktrack || {}),
      sensorRecovery: Object.assign({ needed: false, reason: null }, overrides.sensorRecovery || {})
    };
  }

  function evaluatePhainomenon(input = {}) {
    const frames = Array.isArray(input.frames) ? input.frames : [];
    const latest = input.latest || (frames.length > 0 ? frames[frames.length - 1] : {});
    const previous = input.previous || (frames.length > 1 ? frames[frames.length - 2] : {});
    const result = createPhainomenon();
    const demoRouteGraceActive = Boolean(input.demoRouteGraceActive);
    let looming = detectLooming(latest, previous, frames);
    const damageLocalization = detectDamageLocalization(latest, previous, frames);
    const trap = detectTrap(latest, frames, input.spatialHistory);
    let stuck = detectStuck(input.nousCarrier, latest, frames);
    const explorationEntropy = detectExplorationEntropy(latest, frames);
    const itemBacktrack = detectItemBacktrack(input.itemMemory, latest);
    if (input.preDoorNoCombat && looming.active) {
      looming = { active: false, direction: null };
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
    result.damageLocalization = damageLocalization;
    result.trap = trap;
    result.stuck = stuck;
    result.explorationEntropy = explorationEntropy;
    result.itemBacktrack = itemBacktrack;
    result.sensorRecovery = {
      needed: Boolean(recoveryReason),
      reason: recoveryReason
    };
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

    if (phainomenon.explorationEntropy?.high) {
      detections.push("exploration-entropy");
    }

    if (phainomenon.itemBacktrack?.suggested) {
      detections.push("item-backtrack");
    }

    if (!doorTransitionGraceActive && phainomenon.sensorRecovery?.needed) {
      detections.push("sensor-recovery");
    }

    return detections;
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

  function detectDamageLocalization(latest, previous, frames) {
    const healthDrop = Number(previous.healthActiveCells || 0) - Number(latest.healthActiveCells || 0);
    const zeroRise = Number(latest.healthZeroScore || 0) - Number(previous.healthZeroScore || 0);
    const faceShock = Number(latest.faceDelta || 0) >= COMBAT_FACE_DANGER_DELTA;
    const blind = Number(latest.enemyConfidence || 0) < 0.28 && Number(latest.projectileScore || 0) < 0.12;
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
    const lowMotion = Number(latest.movementSpeed || 0) <= 0.14;
    const repeatedLowMotion = countRecentLowMotion(frames, 6) >= 4;
    const repeatedView = countRecentBaseSignature(frames, latest.base3x3Signature, 10) >= 5;
    const visualStill = Number(latest.temporalDelta || 0) <= 0.05 && Math.max(Math.abs(Number(latest.flowX || 0)), Math.abs(Number(latest.flowY || 0))) <= 0.08;
    const blocked = Number(latest.stuckFrames || 0) >= 2 || Number(latest.inputStallFrames || 0) >= 3;
    const persistentLowMotion = countRecentLowMotion(frames, 8) >= 6;
    const active = wantsForward
      && lowMotion
      && (blocked || (persistentLowMotion && (repeatedView || visualStill)) || (repeatedView && visualStill && repeatedLowMotion));
    return {
      active,
      evidence: active ? (blocked ? "input-stall" : (repeatedView ? "view-repeat" : "low-motion")) : null
    };
  }

  function detectExplorationEntropy(latest, frames) {
    const repeatCount = countRecentBaseSignature(frames, latest.base3x3Signature, 12);
    const noThreat = Number(latest.enemyConfidence || 0) < 0.24
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
    const calm = Number(latest.enemyConfidence || 0) < 0.34
      && Number(latest.projectileScore || 0) < 0.16
      && Number(latest.audioEnergy || 0) < 0.5;
    const suggested = lowHealth && calm && memory.length > 0;
    return {
      suggested,
      targetKind: suggested ? (memory[memory.length - 1].targetKind || "resource") : null
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
