(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const VISION_GRID_COLUMNS = 9;
  const VISION_GRID_ROWS = 9;

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function countActiveColumns(sample, columns) {
    if (!sample?.length || columns <= 0) {
      return 0;
    }

    const active = new Set();
    for (let index = 0; index < sample.length; index += 1) {
      if (Number(sample[index] || 0) > 0) {
        active.add(index % columns);
      }
    }

    return active.size;
  }

  function hasMeaningfulFaceSignature(signature) {
    return /[1-9a-f]/i.test(String(signature || ""));
  }

  function normalizeFaceLifePattern(value, fallback = "unknown") {
    const text = String(value || fallback || "unknown").toLowerCase();
    if (text === "alive-cycle"
      || text === "alive-damaged"
      || text === "single"
      || text === "fixed"
      || text === "dead-fixed"
      || text === "unknown") {
      return text;
    }

    return fallback;
  }

  function normalizeAuditoryEventType(value) {
    const text = String(value || "spatial-event").toLowerCase();
    if (text === "motion"
      || text === "contact"
      || text === "attention"
      || text === "spatial-event"
      || text === "native-sfx"
      || text === "doom-native-sfx"
      || text === "use-response"
      || text === "use-success-gate"
      || text === "use-failed-voice") {
      return text;
    }

    return text === "none" ? "none" : "spatial-event";
  }

  function createAuditorySnapshot(overrides = {}) {
    const leftEnergy = clamp01(Number(overrides.leftEnergy ?? 0));
    const rightEnergy = clamp01(Number(overrides.rightEnergy ?? 0));
    const balance = Math.max(-1, Math.min(1, Number(overrides.balance ?? 0) || 0));
    const lowEnergy = clamp01(Number(overrides.lowEnergy ?? 0));
    const midEnergy = clamp01(Number(overrides.midEnergy ?? 0));
    const highEnergy = clamp01(Number(overrides.highEnergy ?? 0));
    return {
      leftEnergy: round2(leftEnergy),
      rightEnergy: round2(rightEnergy),
      balance: round2(balance),
      dominantFreq: round2(Number(overrides.dominantFreq ?? 0)),
      lowEnergy: round2(lowEnergy),
      midEnergy: round2(midEnergy),
      highEnergy: round2(highEnergy),
      dominantBand: overrides.dominantBand || "none",
      eventDetected: Boolean(overrides.eventDetected),
      eventType: normalizeAuditoryEventType(overrides.eventType),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function buildAuditorySnapshot(state) {
    const source = state?.auditorySnapshot || state?.audio || {};
    const leftEnergy = clamp01(Number(source.leftEnergy ?? source.leftLevel ?? source.left ?? 0));
    const rightEnergy = clamp01(Number(source.rightEnergy ?? source.rightLevel ?? source.right ?? 0));
    const balance = Math.max(-1, Math.min(1, Number(source.balance ?? 0) || 0));
    const dominantFreq = Number(source.dominantFreq ?? source.frequency ?? source.dominantFrequency ?? 0);
    const eventDetected = Boolean(source.eventDetected ?? source.active);
    const bandEnergy = buildAudioBandEnergy(source, dominantFreq, Math.max(leftEnergy, rightEnergy));
    return createAuditorySnapshot({
      leftEnergy,
      rightEnergy,
      balance,
      dominantFreq,
      lowEnergy: bandEnergy.lowEnergy,
      midEnergy: bandEnergy.midEnergy,
      highEnergy: bandEnergy.highEnergy,
      dominantBand: bandEnergy.dominantBand,
      eventDetected,
      eventType: eventDetected ? normalizeAuditoryEventType(source.eventType) : "none",
      timestamp: source.timestamp || state?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    });
  }

  function buildAudioBandEnergy(source, dominantFreq, totalEnergy) {
    const low = source?.lowEnergy ?? source?.lowBandEnergy ?? source?.bands?.low;
    const mid = source?.midEnergy ?? source?.middleEnergy ?? source?.midBandEnergy ?? source?.bands?.mid;
    const high = source?.highEnergy ?? source?.highBandEnergy ?? source?.bands?.high;
    if (Number.isFinite(Number(low)) || Number.isFinite(Number(mid)) || Number.isFinite(Number(high))) {
      const lowEnergy = clamp01(Number(low || 0));
      const midEnergy = clamp01(Number(mid || 0));
      const highEnergy = clamp01(Number(high || 0));
      return {
        lowEnergy,
        midEnergy,
        highEnergy,
        dominantBand: chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy)
      };
    }

    const energy = clamp01(Number(totalEnergy || 0));
    const frequency = Number(dominantFreq || 0);
    if (energy <= 0) {
      return { lowEnergy: 0, midEnergy: 0, highEnergy: 0, dominantBand: "none" };
    }

    if (frequency <= 0) {
      return {
        lowEnergy: round2(energy * 0.38),
        midEnergy: round2(energy * 0.72),
        highEnergy: round2(energy * 0.28),
        dominantBand: "mid"
      };
    }

    if (frequency < 280) {
      return { lowEnergy: energy, midEnergy: round2(energy * 0.32), highEnergy: 0, dominantBand: "low" };
    }

    if (frequency < 2100) {
      return { lowEnergy: round2(energy * 0.24), midEnergy: energy, highEnergy: round2(energy * 0.18), dominantBand: "mid" };
    }

    return { lowEnergy: 0, midEnergy: round2(energy * 0.28), highEnergy: energy, dominantBand: "high" };
  }

  function chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy) {
    const low = Number(lowEnergy || 0);
    const mid = Number(midEnergy || 0);
    const high = Number(highEnergy || 0);
    const peak = Math.max(low, mid, high);
    if (peak <= 0.02) {
      return "none";
    }

    if (high >= mid && high >= low) {
      return "high";
    }

    return mid >= low ? "mid" : "low";
  }

  function normalizeVision9x9(values) {
    const length = VISION_GRID_COLUMNS * VISION_GRID_ROWS;
    const output = new Array(length);
    for (let index = 0; index < length; index += 1) {
      output[index] = Math.max(0, Math.min(15, Math.round(Number(values?.[index] || 0))));
    }

    return output;
  }

  function visionSignature(values) {
    return (values || [])
      .map(value => Math.max(0, Math.min(15, Math.round(Number(value || 0)))).toString(16))
      .join("");
  }

  function createVisionSensorSnapshot(overrides = {}) {
    const quantized = normalizeVision9x9(overrides.quantized);
    const signature = overrides.signature || visionSignature(quantized).padEnd(VISION_GRID_COLUMNS * VISION_GRID_ROWS, "0").slice(0, VISION_GRID_COLUMNS * VISION_GRID_ROWS);
    const confidence = clamp01(Number(overrides.confidence ?? 0));
    return {
      active: Boolean(overrides.active),
      gridColumns: VISION_GRID_COLUMNS,
      gridRows: VISION_GRID_ROWS,
      quantized,
      signature,
      left: Number(overrides.left || 0),
      center: Number(overrides.center || 0),
      right: Number(overrides.right || 0),
      confidence: round2(confidence),
      eventDetected: Boolean(overrides.eventDetected ?? confidence >= 0.62),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createHealthSensorSnapshot(overrides = {}) {
    const hudReady = Boolean(overrides.hudReady ?? overrides.healthHudReady ?? true);
    const zeroScore = clamp01(Number(overrides.zeroScore ?? 0));
    const faceDeathScore = clamp01(Number(overrides.faceDeathScore ?? 0));
    const deathTintScore = clamp01(Number(overrides.deathTintScore ?? overrides.healthDeathTintScore ?? 0));
    const statusDeathTintScore = clamp01(Number(overrides.statusDeathTintScore ?? overrides.healthStatusDeathTintScore ?? 0));
    const faceDeathTintScore = clamp01(Number(overrides.faceDeathTintScore ?? overrides.healthFaceDeathTintScore ?? 0));
    const faceBloodScore = clamp01(Number(overrides.faceBloodScore ?? overrides.healthFaceBloodScore ?? 0));
    const faceBloodRatio = clamp01(Number(overrides.faceBloodRatio ?? overrides.healthFaceBloodRatio ?? 0));
    const freezeScore = clamp01(Number(overrides.freezeScore ?? 0));
    const faceSignature = String(overrides.faceSignature ?? overrides.healthFaceSignature ?? "0000000000000000");
    const faceSignatureValid = hasMeaningfulFaceSignature(faceSignature);
    const faceQuantizedFrameChange = Number(overrides.faceQuantizedFrameChange ?? 255);
    const facePoseDiversity = Math.max(0, Math.min(3, Math.floor(Number(overrides.facePoseDiversity ?? overrides.healthFacePoseDiversity ?? 0))));
    const faceFixedFrames = Math.max(0, Math.floor(Number(overrides.faceFixedFrames ?? overrides.healthFaceFixedFrames ?? overrides.faceNoHeartbeatFrames ?? overrides.healthFaceNoHeartbeatFrames ?? overrides.noHeartbeatFrames ?? 0)));
    const explicitFaceHeartbeatScore = overrides.faceHeartbeatScore ?? overrides.healthFaceHeartbeatScore;
    const faceHeartbeatScore = clamp01(Number(explicitFaceHeartbeatScore
      ?? (faceSignatureValid && Number.isFinite(faceQuantizedFrameChange) ? faceQuantizedFrameChange / 8 : 0)));
    const faceHeartbeatAlive = faceSignatureValid
      && (explicitFaceHeartbeatScore != null || faceQuantizedFrameChange <= 24 || facePoseDiversity >= 2)
      && faceHeartbeatScore >= 0.08;
    const faceNoHeartbeatFrames = Math.max(0, Math.floor(Number(overrides.faceNoHeartbeatFrames ?? overrides.healthFaceNoHeartbeatFrames ?? overrides.noHeartbeatFrames ?? faceFixedFrames)));
    const noHeartbeatDeathFrames = Math.max(1, Math.floor(Number(overrides.noHeartbeatDeathFrames ?? overrides.healthNoHeartbeatDeathFrames ?? 90)));
    const faceBloodDeathFrames = Math.min(noHeartbeatDeathFrames, Math.max(8, Math.floor(Number(overrides.faceBloodDeathFrames ?? overrides.healthFaceBloodDeathFrames ?? 18))));
    const activeCells = Number(overrides.activeCells || 0);
    const activeColumns = Number(overrides.activeColumns || 0);
    const sampleColumns = Math.max(1, Number(overrides.sampleColumns || 8));
    const sampleCells = Math.max(1, Number(overrides.sampleCells || 24));
    const estimatedPercent = Math.max(0, Math.min(100, Math.round(Number(
      overrides.estimatedPercent
        ?? overrides.value
        ?? overrides.health
        ?? (Boolean(overrides.likelyDead) ? 0 : 100)))));
    const lowHealthThreshold = Math.max(1, Math.min(100, Math.round(Number(overrides.lowHealthThreshold ?? 50))));
    if (!hudReady) {
      return {
        active: Boolean(overrides.active),
        hudReady: false,
        signature: overrides.signature || "000000000000000000000000",
        faceSignature,
        faceSignatureValid,
        faceQuantizedFrameChange: round2(faceQuantizedFrameChange),
        facePoseDiversity,
        faceLifePattern: "unknown",
        faceFixedFrames,
        faceHeartbeatScore: round2(faceHeartbeatScore),
        faceHeartbeatAlive,
        faceNoHeartbeatFrames,
        noHeartbeatDeath: false,
        noHeartbeatDeathFrames,
        faceDeathScore: 0,
        deathTintScore: round2(deathTintScore),
        statusDeathTintScore: round2(statusDeathTintScore),
        faceDeathTintScore: round2(faceDeathTintScore),
        faceBloodScore: round2(faceBloodScore),
        faceBloodRatio: round2(faceBloodRatio),
        freezeScore: 0,
        zeroScore: 0,
        activeColumns,
        activeCells,
        sampleColumns,
        sampleCells,
        estimatedPercent: 100,
        value: 100,
        health: 100,
        lowHealth: false,
        lowHealthThreshold,
        likelyDead: false,
        criticalBloodAlive: false,
        bloodDangerScore: 0,
        healthDangerReason: "none",
        confidence: 0,
        retryRequested: false,
        retryReason: "hud-not-ready",
        retryPipeline: "none",
        retryPriority: 0,
        source: overrides.source || "status-hud-not-ready",
        timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
      };
    }

    const sparseHealthDigits = activeCells > 0
      && activeCells <= Math.ceil(sampleCells * 0.32)
      && activeColumns <= Math.ceil(sampleColumns * 0.48);
    const severeHealthDigits = zeroScore >= 0.62 && activeCells <= Math.ceil(sampleCells * 0.38);
    const noHealthDigits = activeCells <= 1 && zeroScore <= 0.36;
    const tintDeath = noHealthDigits
      && deathTintScore >= 0.5
      && (statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.18
        || faceDeathScore >= 0.12
        || freezeScore >= 0.5);
    const faceBloodDeath = faceBloodScore >= 0.72
      && faceBloodRatio >= 0.28
      && !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= faceBloodDeathFrames
      && freezeScore >= 0.5
      && (statusDeathTintScore >= 0.42
        || deathTintScore >= 0.48
        || faceDeathTintScore >= 0.44
        || faceDeathScore >= 0.24);
    const noHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= noHeartbeatDeathFrames
      && freezeScore >= 0.5
      && (faceDeathScore >= 0.16
        || deathTintScore >= 0.42
        || statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.22
        || zeroScore >= 0.52
        || faceBloodScore >= 0.30);
    const confidence = clamp01(Number(overrides.confidence ?? Math.max(zeroScore, faceDeathScore, faceBloodScore, deathTintScore * 0.78, freezeScore * 0.55)));
    const likelyDead = Boolean(overrides.likelyDead)
      || (sparseHealthDigits && zeroScore >= 0.44 && faceDeathScore >= 0.24)
      || (severeHealthDigits && faceDeathScore >= 0.22)
      || (sparseHealthDigits && zeroScore >= 0.52 && faceDeathScore >= 0.14 && freezeScore >= 0.75)
      || faceBloodDeath
      || noHeartbeatDeath
      || tintDeath;
    const faceLifePattern = normalizeFaceLifePattern(overrides.faceLifePattern ?? overrides.healthFaceLifePattern,
      likelyDead
        ? "dead-fixed"
        : (faceHeartbeatAlive && faceBloodScore >= 0.58
          ? "alive-damaged"
          : (faceHeartbeatAlive || facePoseDiversity >= 2
            ? "alive-cycle"
            : (faceSignatureValid ? (faceFixedFrames > 0 ? "fixed" : "single") : "unknown"))));
    const retryReason = overrides.retryReason || (likelyDead ? (tintDeath ? "health-red-tint-death" : (faceBloodDeath ? "health-face-blood-death" : (noHeartbeatDeath ? "health-no-heartbeat-death" : "health-death"))) : "none");
    const stablePercent = (tintDeath || faceBloodDeath || noHeartbeatDeath) ? 0 : estimatedPercent;
    const bloodDangerScore = clamp01(Math.max(faceBloodScore * 0.75, faceBloodRatio * 1.1, faceDeathTintScore * 0.5));
    const criticalBloodAlive = !likelyDead
      && stablePercent > 0
      && faceHeartbeatAlive
      && faceBloodScore >= 0.68
      && faceBloodRatio >= 0.24;
    const healthDangerReason = criticalBloodAlive
      ? "face-heartbeat-blood"
      : (stablePercent > 0 && stablePercent < lowHealthThreshold ? "low-health" : "none");
    const retryRequested = Boolean(overrides.retryRequested ?? (Boolean(overrides.active) && (likelyDead || (zeroScore >= 0.78 && !faceHeartbeatAlive))));
    return {
      active: Boolean(overrides.active),
      hudReady: true,
      signature: overrides.signature || "000000000000000000000000",
      faceSignature,
      faceSignatureValid,
      faceQuantizedFrameChange: round2(faceQuantizedFrameChange),
      facePoseDiversity,
      faceLifePattern,
      faceFixedFrames,
      faceHeartbeatScore: round2(faceHeartbeatScore),
      faceHeartbeatAlive,
      faceNoHeartbeatFrames,
      noHeartbeatDeath,
      noHeartbeatDeathFrames,
      faceBloodDeathFrames,
      faceDeathScore: round2(faceDeathScore),
      deathTintScore: round2(deathTintScore),
      statusDeathTintScore: round2(statusDeathTintScore),
      faceDeathTintScore: round2(faceDeathTintScore),
      faceBloodScore: round2(faceBloodScore),
      faceBloodRatio: round2(faceBloodRatio),
      freezeScore: round2(freezeScore),
      zeroScore: round2(zeroScore),
      activeColumns,
      activeCells,
      sampleColumns,
      sampleCells,
      estimatedPercent: stablePercent,
      value: stablePercent,
      health: stablePercent,
      lowHealth: stablePercent > 0 && stablePercent < lowHealthThreshold,
      lowHealthThreshold,
      likelyDead,
      criticalBloodAlive,
      bloodDangerScore: round2(bloodDangerScore),
      healthDangerReason,
      confidence: round2(confidence),
      retryRequested,
      retryReason,
      retryPipeline: retryRequested ? "Retry" : "none",
      retryPriority: retryRequested ? Number(overrides.retryPriority ?? 100) : 0,
      source: overrides.source || "status-health-face-quantized",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createDisabledHealthState(signature) {
    return {
      signature: signature || "000000000000000000000000",
      likelyDead: false,
      zeroScore: 0,
      activeColumns: 0,
      activeCells: 0,
      estimatedPercent: 100,
      value: 100,
      health: 100,
      hudReady: false,
      lowHealth: false,
      lowHealthThreshold: 50,
      faceDeathScore: 0,
      faceBloodScore: 0,
      faceBloodRatio: 0,
      facePoseDiversity: 0,
      faceLifePattern: "unknown",
      faceFixedFrames: 0,
      faceHeartbeatScore: 0,
      faceHeartbeatAlive: false,
      faceNoHeartbeatFrames: 0,
      noHeartbeatDeath: false,
      noHeartbeatDeathFrames: 90,
      criticalBloodAlive: false,
      bloodDangerScore: 0,
      healthDangerReason: "none",
      freezeScore: 0,
      retryReason: "sensor-cutoff"
    };
  }

  function estimateFaceDeathScore(quantizedFace) {
    if (!Array.isArray(quantizedFace) || quantizedFace.length === 0) {
      return 0;
    }

    let danger = 0;
    let critical = 0;
    const length = quantizedFace.length;
    for (let index = 0; index < length; index += 1) {
      const value = Number(quantizedFace[index] || 0);
      if (value >= 5) {
        danger += 1;
      }

      if (value >= 7) {
        critical += 1;
      }
    }

    return clamp01((danger / length) * 2.4 + (critical / length) * 1.2);
  }

  function refineHealthState(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta) {
    if (healthState?.hudReady === false || healthState?.healthHudReady === false) {
      return Object.assign({}, healthState || {}, {
        hudReady: false,
        likelyDead: false,
        retryRequested: false,
        retryReason: "hud-not-ready",
        estimatedPercent: 100,
        value: 100,
        health: 100,
        lowHealth: false
      });
    }

    const zeroScore = clamp01(Number(healthState?.zeroScore || 0));
    const faceScore = clamp01(Number(faceDeathScore || 0));
    const deathTintScore = clamp01(Number(healthState?.deathTintScore ?? healthState?.healthDeathTintScore ?? 0));
    const statusDeathTintScore = clamp01(Number(healthState?.statusDeathTintScore ?? healthState?.healthStatusDeathTintScore ?? 0));
    const faceDeathTintScore = clamp01(Number(healthState?.faceDeathTintScore ?? healthState?.healthFaceDeathTintScore ?? 0));
    const faceBloodScore = clamp01(Number(healthState?.faceBloodScore ?? healthState?.healthFaceBloodScore ?? 0));
    const faceBloodRatio = clamp01(Number(healthState?.faceBloodRatio ?? healthState?.healthFaceBloodRatio ?? 0));
    const activeCells = Number(healthState?.activeCells || 0);
    const activeColumns = Number(healthState?.activeColumns || 0);
    const sampleColumns = Math.max(1, Number(healthState?.sampleColumns || 8));
    const sampleCells = Math.max(1, Number(healthState?.sampleCells || 24));
    const faceSignature = String(healthState?.faceSignature ?? healthState?.healthFaceSignature ?? "0000000000000000");
    const faceSignatureValid = hasMeaningfulFaceSignature(faceSignature);
    const faceChange = Number(faceQuantizedFrameChange ?? healthState?.faceQuantizedFrameChange ?? 255);
    const facePoseDiversity = Math.max(0, Math.min(3, Math.floor(Number(healthState?.facePoseDiversity ?? healthState?.healthFacePoseDiversity ?? 0))));
    const faceFixedFrames = Math.max(0, Math.floor(Number(healthState?.faceFixedFrames ?? healthState?.healthFaceFixedFrames ?? healthState?.faceNoHeartbeatFrames ?? healthState?.healthFaceNoHeartbeatFrames ?? healthState?.noHeartbeatFrames ?? 0)));
    const explicitFaceHeartbeatScore = healthState?.faceHeartbeatScore ?? healthState?.healthFaceHeartbeatScore;
    const faceHeartbeatScore = clamp01(Number(explicitFaceHeartbeatScore ?? (faceSignatureValid && Number.isFinite(faceChange) ? faceChange / 8 : 0)));
    const faceHeartbeatAlive = faceSignatureValid
      && (explicitFaceHeartbeatScore != null || faceChange <= 24 || facePoseDiversity >= 2)
      && faceHeartbeatScore >= 0.08;
    const faceNoHeartbeatFrames = Math.max(0, Math.floor(Number(healthState?.faceNoHeartbeatFrames ?? healthState?.healthFaceNoHeartbeatFrames ?? healthState?.noHeartbeatFrames ?? faceFixedFrames)));
    const noHeartbeatDeathFrames = Math.max(1, Math.floor(Number(healthState?.noHeartbeatDeathFrames ?? healthState?.healthNoHeartbeatDeathFrames ?? 90)));
    const faceBloodDeathFrames = Math.min(noHeartbeatDeathFrames, Math.max(8, Math.floor(Number(healthState?.faceBloodDeathFrames ?? healthState?.healthFaceBloodDeathFrames ?? 18))));
    const faceStable = !faceHeartbeatAlive && (!faceSignatureValid || faceChange <= 0.32);
    const visualStable = Number(visualStallDelta ?? 255) <= 0.08;
    const freezeScore = clamp01((faceStable ? 0.5 : 0) + (visualStable ? 0.5 : 0));
    const sparseHealthDigits = activeCells > 0
      && activeCells <= Math.ceil(sampleCells * 0.32)
      && activeColumns <= Math.ceil(sampleColumns * 0.48);
    const severeHealthDigits = zeroScore >= 0.62 && activeCells <= Math.ceil(sampleCells * 0.38);
    const faceDeath = (sparseHealthDigits && zeroScore >= 0.44 && faceScore >= 0.24)
      || (severeHealthDigits && faceScore >= 0.22);
    const frozenDeath = sparseHealthDigits && zeroScore >= 0.52 && faceScore >= 0.14 && freezeScore >= 0.75;
    const noHealthDigits = activeCells <= 1 && zeroScore <= 0.36;
    const tintDeath = noHealthDigits
      && deathTintScore >= 0.5
      && (statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.18
        || faceScore >= 0.12
        || freezeScore >= 0.5);
    const faceBloodDeath = faceBloodScore >= 0.72
      && faceBloodRatio >= 0.28
      && !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= faceBloodDeathFrames
      && freezeScore >= 0.5
      && (statusDeathTintScore >= 0.42
        || deathTintScore >= 0.48
        || faceDeathTintScore >= 0.44
        || faceScore >= 0.24);
    const noHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= noHeartbeatDeathFrames
      && freezeScore >= 0.5
      && (faceScore >= 0.16
        || deathTintScore >= 0.42
        || statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.22
        || zeroScore >= 0.52
        || faceBloodScore >= 0.30);
    const likelyDead = Boolean(healthState?.likelyDead) || faceDeath || frozenDeath || tintDeath || faceBloodDeath || noHeartbeatDeath;
    const faceLifePattern = normalizeFaceLifePattern(healthState?.faceLifePattern ?? healthState?.healthFaceLifePattern,
      likelyDead
        ? "dead-fixed"
        : (faceHeartbeatAlive && faceBloodScore >= 0.58
          ? "alive-damaged"
          : (faceHeartbeatAlive || facePoseDiversity >= 2
            ? "alive-cycle"
            : (faceSignatureValid ? (faceFixedFrames > 0 ? "fixed" : "single") : "unknown"))));
    const collapseToZero = tintDeath || faceBloodDeath || noHeartbeatDeath;
    const nextHealth = collapseToZero ? 0 : Number(healthState?.health ?? healthState?.value ?? healthState?.estimatedPercent ?? 100);
    const bloodDangerScore = clamp01(Math.max(faceBloodScore * 0.75, faceBloodRatio * 1.1, faceDeathTintScore * 0.5));
    const criticalBloodAlive = !likelyDead
      && nextHealth > 0
      && faceHeartbeatAlive
      && faceBloodScore >= 0.68
      && faceBloodRatio >= 0.24;
    const healthDangerReason = criticalBloodAlive
      ? "face-heartbeat-blood"
      : (healthState?.lowHealth ? "low-health" : "none");
    return Object.assign({}, healthState || {}, {
      likelyDead,
      faceDeathScore: faceScore,
      deathTintScore: round2(deathTintScore),
      statusDeathTintScore: round2(statusDeathTintScore),
      faceDeathTintScore: round2(faceDeathTintScore),
      faceBloodScore: round2(faceBloodScore),
      faceBloodRatio: round2(faceBloodRatio),
      faceSignature,
      faceSignatureValid,
      facePoseDiversity,
      faceLifePattern,
      faceFixedFrames,
      faceHeartbeatScore: round2(faceHeartbeatScore),
      faceHeartbeatAlive,
      faceNoHeartbeatFrames,
      noHeartbeatDeath,
      noHeartbeatDeathFrames,
      faceBloodDeathFrames,
      criticalBloodAlive,
      bloodDangerScore: round2(bloodDangerScore),
      healthDangerReason,
      freezeScore,
      estimatedPercent: collapseToZero ? 0 : healthState?.estimatedPercent,
      value: collapseToZero ? 0 : healthState?.value,
      health: collapseToZero ? 0 : healthState?.health,
      retryReason: likelyDead
        ? (tintDeath ? "health-red-tint-death" : (faceBloodDeath ? "health-face-blood-death" : (noHeartbeatDeath ? "health-no-heartbeat-death" : (faceDeath ? "health-face-death" : (frozenDeath ? "health-freeze-death" : healthState?.retryReason || "health-zero-score")))))
        : "none"
    });
  }

  function createSpatialSnapshot(overrides = {}) {
    const visualDirection = Number(overrides.visualDirection ?? 0);
    const auditoryCorrection = Number(overrides.auditoryCorrection ?? 0);
    const fusedDirection = Number(overrides.fusedDirection ?? 0);
    return {
      visualDirection: round2(visualDirection),
      auditoryCorrection: round2(auditoryCorrection),
      fusedDirection: round2(fusedDirection),
      hudX: round2(clamp01(Number(overrides.hudX ?? 0.5))),
      hudY: round2(clamp01(Number(overrides.hudY ?? 0.45))),
      confidence: round2(clamp01(Number(overrides.confidence ?? 0))),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP,
      eventDetected: Boolean(overrides.eventDetected),
      eventType: normalizeAuditoryEventType(overrides.eventType),
      gain: Number(overrides.gain ?? 0)
    };
  }

  self.AIKernelDoomSensory = Object.freeze({
    buildAudioBandEnergy,
    buildAuditorySnapshot,
    chooseDominantAudioBand,
    countActiveColumns,
    createAuditorySnapshot,
    createDisabledHealthState,
    createHealthSensorSnapshot,
    createVisionSensorSnapshot,
    createSpatialSnapshot,
    estimateFaceDeathScore,
    normalizeVision9x9,
    normalizeAuditoryEventType,
    refineHealthState
  });
})();
