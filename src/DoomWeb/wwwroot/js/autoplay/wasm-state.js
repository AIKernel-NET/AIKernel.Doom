(function () {
  "use strict";

  const SENSOR_TENSOR_SIZE = 32;
  const SENSOR_TENSOR_SHAPE = Object.freeze([4, 8]);
  const SENSOR_TENSOR_VERSION = "doom-sensor-tensor-v1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function canonicalDoorOpenedCount(...sources) {
    let sawCount = false;
    let countValue = 0;
    let legacyValue = 0;
    sources.forEach(source => {
      if (!source || typeof source !== "object") {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(source, "doorOpenedCount")) {
        sawCount = true;
        countValue = Math.max(countValue, number(source.doorOpenedCount, 0));
        return;
      }
      if (Object.prototype.hasOwnProperty.call(source, "doorOpened")) {
        legacyValue = Math.max(legacyValue, number(source.doorOpened, 0));
      }
    });
    return Math.max(0, sawCount ? countValue : legacyValue);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, number(value)));
  }

  function faceHealthPercentFromLevel(level, phase) {
    const normalizedPhase = String(phase || "").trim().toLowerCase();
    if (normalizedPhase === "dead" || normalizedPhase === "death" || normalizedPhase === "dead-fixed") {
      return 0;
    }
    if (normalizedPhase === "invulnerable" || normalizedPhase === "god" || normalizedPhase === "iddqd") {
      return 100;
    }

    const parsed = Math.round(number(level, NaN));
    if (!Number.isFinite(parsed)) {
      return NaN;
    }

    if (parsed >= 5) {
      return 100;
    }
    if (parsed === 4) {
      return 75;
    }
    if (parsed === 3) {
      return 55;
    }
    if (parsed === 2) {
      return 30;
    }
    if (parsed === 1) {
      return 12;
    }
    return NaN;
  }

  function meaningfulFaceValue(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value === undefined || value === null) {
        continue;
      }
      const text = String(value).trim().toLowerCase();
      if (text && text !== "unknown" && text !== "none") {
        return value;
      }
    }
    return undefined;
  }

  function isDefinitiveFacePhase(phase) {
    const normalized = String(phase || "").trim().toLowerCase();
    return normalized === "dead"
      || normalized === "death"
      || normalized === "dead-fixed"
      || normalized === "invulnerable"
      || normalized === "god"
      || normalized === "iddqd";
  }

  function resolveHealthPercent(fallback, ...sources) {
    let numericHealth = NaN;
    let faceHealth = NaN;
    let faceConfidence = 0;
    let faceAuthoritative = false;

    sources.forEach(source => {
      if (!source || typeof source !== "object") {
        return;
      }

      const numeric = number(
        source.health
          ?? source.hp
          ?? source.value
          ?? source.estimatedPercent
          ?? source.healthEstimatedPercent,
        NaN);
      if (Number.isFinite(numeric) && !Number.isFinite(numericHealth)) {
        numericHealth = Math.max(0, Math.min(100, numeric));
      }

      const stablePhase = meaningfulFaceValue(
        source.faceLifeTemplatePhase,
        source.healthFaceLifeTemplatePhase,
        source.faceLifePhase,
        source.healthFaceLifePhase);
      const stableLevel = meaningfulFaceValue(
        source.faceLifeTemplateLevel,
        source.healthFaceLifeTemplateLevel,
        source.faceLifeLevel,
        source.healthFaceLifeLevel);
      let candidate = faceHealthPercentFromLevel(stableLevel, stablePhase);
      if (!Number.isFinite(candidate)) {
        const quantizedPhase = meaningfulFaceValue(
          source.faceLifeQuantizedPhase,
          source.healthFaceLifeQuantizedPhase);
        const quantizedLevel = meaningfulFaceValue(
          source.faceLifeQuantizedLevel,
          source.healthFaceLifeQuantizedLevel);
        const quantizedCandidate = faceHealthPercentFromLevel(quantizedLevel, quantizedPhase);
        const quantizedConfidence = clamp01(source.faceLifeQuantizedConfidence
          ?? source.healthFaceLifeQuantizedConfidence
          ?? source.faceTemplateConfidence
          ?? source.healthFaceTemplateConfidence
          ?? 0);
        if (Number.isFinite(quantizedCandidate)
            && (isDefinitiveFacePhase(quantizedPhase) || quantizedConfidence >= 0.92)) {
          candidate = quantizedCandidate;
        }
      }
      if (!Number.isFinite(candidate) && Number.isFinite(numeric) && numeric > 0 && numeric <= 5) {
        const phaseHint = meaningfulFaceValue(
          stablePhase,
          source.faceLifePattern,
          source.healthFaceLifePattern);
        if (phaseHint !== undefined || source.faceHeartbeatAlive === true || source.faceSignatureValid === true) {
          candidate = faceHealthPercentFromLevel(numeric, phaseHint);
        }
      }
      const confidence = clamp01(source.faceLifeTemplateConfidence
        ?? source.healthFaceLifeTemplateConfidence
        ?? source.faceTemplateConfidence
        ?? source.healthFaceTemplateConfidence
        ?? source.faceLifeConfidence
        ?? source.healthFaceLifeConfidence
        ?? 0);
      if (Number.isFinite(candidate) && confidence >= faceConfidence) {
        faceHealth = candidate;
        faceConfidence = confidence;
        faceAuthoritative = faceAuthoritative
          || Boolean(source.faceLifeTemplateAuthoritative)
          || Boolean(source.healthFaceLifeTemplateAuthoritative);
      }
    });

    const faceTrusted = Number.isFinite(faceHealth)
      && (faceAuthoritative || !Number.isFinite(numericHealth) || numericHealth <= 0);
    const numericLooksLikeFaceLevel = Number.isFinite(faceHealth)
      && Number.isFinite(numericHealth)
      && numericHealth > 0
      && numericHealth <= 5;
    if (faceTrusted || numericLooksLikeFaceLevel) {
      return faceHealth;
    }
    if (Number.isFinite(numericHealth)) {
      return numericHealth;
    }
    return Math.max(0, Math.min(100, number(fallback, 100)));
  }

  function maxScore(...values) {
    return clamp01(values.reduce((best, value) => Math.max(best, number(value, 0)), 0));
  }

  function readParameter(runtime, name, fallback) {
    const value = runtime?.autoplayProfile?.parameters?.[name];
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function direction(value, fallback = "none") {
    return value === "left" || value === "right" ? value : fallback;
  }

  function audioEnergy(audio) {
    return maxScore(
      audio?.leftEnergy,
      audio?.rightEnergy,
      audio?.lowEnergy,
      audio?.midEnergy,
      audio?.highEnergy);
  }

  function isNativeDoorSfx(audio) {
    const eventType = String(audio?.eventType || "").toLowerCase();
    return Boolean(audio?.eventDetected)
      && (eventType === "native-sfx"
        || eventType === "doom-native-sfx"
        || eventType === "use-success-gate"
        || eventType === "use-response");
  }

  function normalizeAudioEventType(value) {
    return String(value || "none").trim().toLowerCase();
  }

  function firstNonEmptyText(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }

    return "";
  }

  function doorOpenAudioSemantic(audio, supervisorStatus, runtime) {
    const evidence = audio?.doorOpenAudioEvidence
      || supervisorStatus?.doorOpenAudioEvidence
      || supervisorStatus?.autoplayState?.doorOpenAudioEvidence
      || runtime?.autoplayDoorOpenAudioEvidence
      || {};
    const semanticClass = normalizeAudioEventType(firstNonEmptyText(
      audio?.semanticClass,
      audio?.semanticEventType,
      evidence?.semanticClass,
      evidence?.eventType,
      audio?.eventType));
    const semanticLabel = firstNonEmptyText(
      audio?.semanticLabel,
      evidence?.semanticLabel,
      semanticClass === "door-open-failed" ? "Door open failed" : "");
    const energy = maxScore(audioEnergy(audio), evidence?.energy);
    const failed = semanticClass === "door-open-failed"
      || Boolean(evidence?.classifiedDoorFailureEvent);
    const opened = semanticClass === "door-open"
      || Boolean(evidence?.classifiedDoorOpenEvent || evidence?.confirmed);
    return {
      semanticClass,
      semanticLabel,
      energy,
      failed,
      opened
    };
  }

  function isDoorUseAudioEventType(eventType) {
    return eventType === "use-success-gate"
      || eventType === "use-failed-voice"
      || eventType === "use-response";
  }

  function audioBalance(audio) {
    const explicit = number(audio?.balance, NaN);
    if (Number.isFinite(explicit)) {
      return Math.max(-1, Math.min(1, explicit));
    }

    const left = number(audio?.leftEnergy, 0);
    const right = number(audio?.rightEnergy, 0);
    const total = left + right;
    return total > 0 ? Math.max(-1, Math.min(1, (right - left) / total)) : 0;
  }

  function auditoryEnemyDirection(audio) {
    const balance = audioBalance(audio);
    if (balance > 0.12) {
      return "right";
    }

    if (balance < -0.12) {
      return "left";
    }

    return "front";
  }

  function auditoryEnemyConfidence(audio) {
    const eventType = normalizeAudioEventType(audio?.eventType);
    if (isDoorUseAudioEventType(eventType)) {
      return 0;
    }

    const energy = audioEnergy(audio);
    const band = maxScore(audio?.midEnergy, audio?.highEnergy, number(audio?.lowEnergy, 0) * 0.54, energy * 0.72);
    const eventLikelyCombat = Boolean(audio?.eventDetected)
      && (eventType === "native-sfx"
        || eventType === "doom-native-sfx"
        || eventType === "spatial-event"
        || eventType === "attention"
        || eventType === "contact");
    if (energy < 0.035 && !eventLikelyCombat) {
      return 0;
    }

    const balanceBoost = Math.min(0.12, Math.abs(audioBalance(audio)) * 0.16);
    const eventBoost = eventLikelyCombat ? 0.16 : 0;
    return maxScore((band * 0.78) + balanceBoost + eventBoost);
  }

  function visionBoxTurn(box) {
    if (!box || !Number.isFinite(Number(box.column))) {
      return "none";
    }

    const center = number(box.column, 4) + (Math.max(1, number(box.columns, 1)) * 0.5);
    if (center < 3.5) {
      return "left";
    }

    if (center > 5.5) {
      return "right";
    }

    return "none";
  }

  function resolveSpawnLandmarkRoute(runtime, frame, spawnGap) {
    const gapScore = clamp01(number(spawnGap?.score, frame?.spawnCorridorGapScore));
    const centerAnchorScore = clamp01(number(frame?.spawnCenterAnchorScore, 0));
    const courtyardScore = clamp01(number(frame?.courtyardScore, 0));
    const secretScore = clamp01(number(frame?.spawnSecretDoorScore, 0));
    const westStairScore = clamp01(number(frame?.spawnWestStairScore, 0));
    const candidates = [
      { kind: "corridor-gap", evidence: gapScore, turn: direction(spawnGap?.turn, direction(frame?.spawnCorridorGapTurn, "right")) },
      { kind: "spawn-center-anchor", evidence: centerAnchorScore, turn: direction(frame?.spawnCenterAnchorTurn, "right") },
      { kind: "east-window-anchor", evidence: courtyardScore * 0.82, turn: direction(frame?.courtyardTurn, "left") },
      { kind: "west-stair-anchor", evidence: westStairScore * 0.78, turn: direction(frame?.spawnWestStairTurn, "right") }
    ];
    let best = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      if (candidates[index].evidence > best.evidence) {
        best = candidates[index];
      }
    }

    const previousFrames = Math.max(0, Math.floor(number(runtime?.autoplaySpawnLandmarkRouteFrames, 0)));
    const stableBonus = Math.min(0.12, previousFrames * 0.015);
    const evidence = clamp01(best.evidence + stableBonus);
    const frames = evidence >= 0.28
      ? Math.min(999, previousFrames + 1)
      : Math.max(0, previousFrames - 1);
    if (runtime) {
      runtime.autoplaySpawnLandmarkRouteFrames = frames;
    }

    return {
      kind: evidence >= 0.12 ? best.kind : "none",
      turn: evidence >= 0.12 ? best.turn : "right",
      evidence,
      frames
    };
  }

  function resolveSpawnGapTurn(runtime, score, turn, doorOpened) {
    const rawTurn = turn === "left" || turn === "right" ? turn : "none";
    if (!runtime || doorOpened || rawTurn === "none") {
      return {
        score,
        turn: rawTurn,
        locked: false,
        frames: 0
      };
    }

    const threshold = Math.max(0.16, readParameter(runtime, "spawnCorridorGapLockThreshold", 0.2));
    const holdFrames = Math.max(1, Math.floor(readParameter(runtime, "spawnCorridorGapLockFrames", 180)));
    const switchMargin = Math.max(0.02, readParameter(runtime, "spawnCorridorGapSwitchMargin", 0.12));
    const frames = Math.max(0, Math.floor(Number(runtime.autoplaySpawnCorridorGapLockFrames || 0)));
    const lockedTurn = runtime.autoplaySpawnCorridorGapLockedTurn === "left" || runtime.autoplaySpawnCorridorGapLockedTurn === "right"
      ? runtime.autoplaySpawnCorridorGapLockedTurn
      : "none";
    const lockedScore = number(runtime.autoplaySpawnCorridorGapLockedScore, 0);

    if (score >= threshold) {
      if (lockedTurn === "none" || frames <= 0 || rawTurn === lockedTurn || score >= lockedScore + switchMargin) {
        runtime.autoplaySpawnCorridorGapLockedTurn = rawTurn;
        runtime.autoplaySpawnCorridorGapLockedScore = score;
        runtime.autoplaySpawnCorridorGapLockFrames = holdFrames;
      } else {
        runtime.autoplaySpawnCorridorGapLockFrames = Math.max(1, frames - 1);
      }
    } else if (frames > 0) {
      runtime.autoplaySpawnCorridorGapLockFrames = frames - 1;
    } else {
      runtime.autoplaySpawnCorridorGapLockedTurn = "none";
      runtime.autoplaySpawnCorridorGapLockedScore = 0;
    }

    const effectiveTurn = runtime.autoplaySpawnCorridorGapLockFrames > 0
      ? runtime.autoplaySpawnCorridorGapLockedTurn
      : rawTurn;
    return {
      score,
      turn: effectiveTurn === "left" || effectiveTurn === "right" ? effectiveTurn : rawTurn,
      locked: runtime.autoplaySpawnCorridorGapLockFrames > 0,
      frames: Math.max(0, Math.floor(Number(runtime.autoplaySpawnCorridorGapLockFrames || 0)))
    };
  }

  function resolveSpawnSecretDoorTurn(runtime, score, turn, doorOpened) {
    const rawTurn = direction(turn, "none");
    if (!runtime || doorOpened || rawTurn === "none") {
      return {
        score,
        turn: rawTurn,
        locked: false,
        frames: 0
      };
    }

    const threshold = Math.max(0.42, readParameter(runtime, "spawnSecretDoorLockThreshold", 0.62));
    const holdFrames = Math.max(1, Math.floor(readParameter(runtime, "spawnSecretDoorLockFrames", 120)));
    const switchMargin = Math.max(0.02, readParameter(runtime, "spawnSecretDoorSwitchMargin", 0.18));
    const frames = Math.max(0, Math.floor(Number(runtime.autoplaySpawnSecretDoorLockFrames || 0)));
    const lockedTurn = direction(runtime.autoplaySpawnSecretDoorLockedTurn, "none");
    const lockedScore = number(runtime.autoplaySpawnSecretDoorLockedScore, 0);

    if (score >= threshold) {
      if (lockedTurn === "none" || frames <= 0 || rawTurn === lockedTurn || score >= lockedScore + switchMargin) {
        runtime.autoplaySpawnSecretDoorLockedTurn = rawTurn;
        runtime.autoplaySpawnSecretDoorLockedScore = score;
        runtime.autoplaySpawnSecretDoorLockFrames = holdFrames;
      } else {
        runtime.autoplaySpawnSecretDoorLockFrames = Math.max(1, frames - 1);
      }
    } else if (frames > 0) {
      runtime.autoplaySpawnSecretDoorLockFrames = frames - 1;
    } else {
      runtime.autoplaySpawnSecretDoorLockedTurn = "none";
      runtime.autoplaySpawnSecretDoorLockedScore = 0;
    }

    const effectiveTurn = runtime.autoplaySpawnSecretDoorLockFrames > 0
      ? runtime.autoplaySpawnSecretDoorLockedTurn
      : rawTurn;
    return {
      score,
      turn: direction(effectiveTurn, rawTurn),
      locked: runtime.autoplaySpawnSecretDoorLockFrames > 0,
      frames: Math.max(0, Math.floor(Number(runtime.autoplaySpawnSecretDoorLockFrames || 0)))
    };
  }

  function resolveSpawnDoorPatternLock(runtime, score, doorOpened) {
    if (!runtime || doorOpened) {
      if (runtime) {
        runtime.autoplaySpawnDoorPatternFrames = 0;
      }
      return 0;
    }

    const threshold = readParameter(runtime, "spawnDoorPatternLockThreshold", 0.34);
    const holdFrames = Math.max(1, Math.floor(readParameter(runtime, "spawnDoorPatternLockFrames", 54)));
    const currentFrames = Math.max(0, Math.floor(Number(runtime.autoplaySpawnDoorPatternFrames || 0)));
    if (score >= threshold) {
      runtime.autoplaySpawnDoorPatternFrames = holdFrames;
    } else if (currentFrames > 0) {
      runtime.autoplaySpawnDoorPatternFrames = currentFrames - 1;
    } else {
      runtime.autoplaySpawnDoorPatternFrames = 0;
    }

    return Math.max(0, Math.floor(Number(runtime.autoplaySpawnDoorPatternFrames || 0)));
  }

  function resolveFirstDoorVisionLock(runtime, score, redScore, turn, box, doorOpened) {
    const rawTurn = direction(turn, "none");
    if (!runtime || doorOpened) {
      if (runtime) {
        runtime.autoplayFirstDoorVisionLockFrames = 0;
        runtime.autoplayFirstDoorVisionLockedScore = 0;
        runtime.autoplayFirstDoorVisionLockedRedScore = 0;
        runtime.autoplayFirstDoorVisionLockedTurn = "none";
        runtime.autoplayFirstDoorVisionLockedBox = null;
      }
      return {
        score,
        redScore,
        turn: rawTurn,
        box,
        locked: false,
        frames: 0
      };
    }

    const threshold = readParameter(runtime, "firstDoorVisionLockThreshold", 0.38);
    const redThreshold = readParameter(runtime, "firstDoorVisionRedLockThreshold", 0.05);
    const holdFrames = Math.max(1, Math.floor(readParameter(runtime, "firstDoorVisionLockFrames", 72)));
    const frames = Math.max(0, Math.floor(Number(runtime.autoplayFirstDoorVisionLockFrames || 0)));
    if (score >= threshold && redScore >= redThreshold) {
      runtime.autoplayFirstDoorVisionLockFrames = holdFrames;
      runtime.autoplayFirstDoorVisionLockedScore = score;
      runtime.autoplayFirstDoorVisionLockedRedScore = redScore;
      runtime.autoplayFirstDoorVisionLockedTurn = rawTurn;
      runtime.autoplayFirstDoorVisionLockedBox = box || null;
    } else if (frames > 0) {
      runtime.autoplayFirstDoorVisionLockFrames = frames - 1;
    } else {
      runtime.autoplayFirstDoorVisionLockFrames = 0;
      runtime.autoplayFirstDoorVisionLockedScore = 0;
      runtime.autoplayFirstDoorVisionLockedRedScore = 0;
      runtime.autoplayFirstDoorVisionLockedTurn = "none";
      runtime.autoplayFirstDoorVisionLockedBox = null;
    }

    const locked = Math.max(0, Math.floor(Number(runtime.autoplayFirstDoorVisionLockFrames || 0))) > 0;
    if (!locked) {
      return {
        score,
        redScore,
        turn: rawTurn,
        box,
        locked: false,
        frames: 0
      };
    }

    return {
      score: Math.max(score, number(runtime.autoplayFirstDoorVisionLockedScore, 0)),
      redScore: Math.max(redScore, number(runtime.autoplayFirstDoorVisionLockedRedScore, 0)),
      turn: direction(runtime.autoplayFirstDoorVisionLockedTurn, rawTurn),
      box: box || runtime.autoplayFirstDoorVisionLockedBox || null,
      locked: true,
      frames: Math.max(0, Math.floor(Number(runtime.autoplayFirstDoorVisionLockFrames || 0)))
    };
  }

  function requireObjectiveRouting(name) {
    const fn = self.AIKernelDoomObjectiveRouting?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomObjectiveRouting.${name} is not available.`);
    }

    return fn;
  }

  function buildWasmSensorTensor(tensor) {
    const source = Array.isArray(tensor?.data) ? tensor.data : null;
    if (!source) {
      return null;
    }

    const data = source.slice(0, SENSOR_TENSOR_SIZE).map(clamp01);
    while (data.length < SENSOR_TENSOR_SIZE) {
      data.push(0);
    }

    return {
      version: tensor.version || SENSOR_TENSOR_VERSION,
      shape: Array.isArray(tensor.shape) ? tensor.shape.slice(0, 2) : Array.from(SENSOR_TENSOR_SHAPE),
      data
    };
  }

  function resolveObjective(signals) {
    return requireObjectiveRouting("resolveObjective")(signals);
  }

  function resolveObjectiveRoute(signals) {
    return requireObjectiveRouting("resolveObjectiveRoute")(signals);
  }

  function isPostFirstDoorIntent(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) {
      return false;
    }

    return /post[- ]?door|computer|monitor|bridge|central|gatekeeper|final|exit/.test(text);
  }

  function createState(runtime, state) {
    const frame = state?.framebuffer || {};
    const audio = state?.audio || {};
    const supervisorStatus = runtime?.bonsaiSupervisor?.status?.() || {};
    const semantic = runtime?.autoplaySemanticMemory || supervisorStatus.semanticMemory || {};
    const firstDoor = semantic.firstDoor || {};
    const computerRoom = semantic.computerRoom || {};
    const bridge = semantic.bridge || {};
    const finalRoom = semantic.finalRoom || {};
    const milestones = supervisorStatus.milestones || {};
    const centralHallEntered = Boolean(supervisorStatus.centralHallEntered ?? milestones.centralHallEntered);
    const centralHallFrames = number(supervisorStatus.centralHallFrames ?? milestones.centralHallFrames, 0);
    const stairsEntered = Boolean(supervisorStatus.stairsEntered ?? milestones.stairsEntered);
    const finalRoomEntered = Boolean(supervisorStatus.finalRoomEntered ?? milestones.finalRoomEntered);
    const finalRoomCandidateFrames = number(supervisorStatus.finalRoomCandidateFrames ?? milestones.finalRoomCandidateFrames, 0);
    const exitSwitchUseFrames = number(supervisorStatus.exitSwitchUseFrames ?? milestones.exitSwitchUseFrames, 0);
    const exitSwitchPressed = Boolean(supervisorStatus.exitSwitchPressed ?? milestones.exitSwitchPressed);
    const enemyDefeatedCount = number(supervisorStatus.enemyDefeatedCount ?? milestones.enemyDefeated ?? milestones.enemyDefeatedCount, 0);
    const ammoLikelyEmpty = Boolean(supervisorStatus.ammoLikelyEmpty ?? milestones.ammoLikelyEmpty);
    const wasmSensorTensor = buildWasmSensorTensor(supervisorStatus.sensorTensor);
    const left = Number(frame.left || 0);
    const center = Number(frame.center || 0);
    const right = Number(frame.right || 0);
    const denominator = Math.max(1, left + center + right);
    const wallVector = Math.max(-1, Math.min(1, (right - left) / denominator));
    const depthSig = Math.max(0, Math.min(1.5, Number(frame.depthEstimate ?? runtime?.autoplayDepthEstimate ?? 1)));
    const contextDict = depthSig >= 0.82
      ? "open-space"
      : (depthSig <= 0.34 ? "wall" : "corridor");
    const health = resolveHealthPercent(100,
      runtime?.autoplayHealthSensor,
      supervisorStatus.healthSensor,
      supervisorStatus,
      frame,
      state?.player);
    const lowHealth = health > 0 && health < 50;
    const damagedHealthPressure = health > 0 && health < 65;
    const faceSig = number(frame.enemyLateralBias, number(runtime?.autoplayEnemyLateralBias, 0));
    const predictions = number(supervisorStatus.predictions ?? runtime?.autoplayPredictions ?? 0, 0);
    const lastUsePulsePrediction = number(
      runtime?.autoplayPipelineState?.kinesis?.lastUsePulsePrediction
        ?? runtime?.autoplayAutoplayState?.pipelineState?.kinesis?.lastUsePulsePrediction
        ?? runtime?.autoplayAutoplayState?.kinesis?.lastUsePulsePrediction
        ?? supervisorStatus.pipelineState?.kinesis?.lastUsePulsePrediction
        ?? supervisorStatus.autoplayState?.pipelineState?.kinesis?.lastUsePulsePrediction
        ?? supervisorStatus.autoplayState?.kinesis?.lastUsePulsePrediction
        ?? supervisorStatus.lastUsePulsePrediction
        ?? -1,
      -1);
    const recentUsePulse = lastUsePulsePrediction >= 0
      && predictions >= lastUsePulsePrediction
      && predictions - lastUsePulsePrediction <= 720;
    const retrySettleText = [
      runtime?.autoplayMode,
      runtime?.autoplayControlPipeline,
      runtime?.autoplayDecisionStage,
      runtime?.autoplayObjective,
      runtime?.autoplayHealthSensor?.retryReason,
      runtime?.autoplayHealthSensor?.healthDangerReason,
      runtime?.autoplayAutoplayState?.healthSensor?.retryReason,
      runtime?.autoplayAutoplayState?.retryReason,
      runtime?.autoplayAutoplayState?.healthRetryReason,
      supervisorStatus.retryReason,
      supervisorStatus.healthRetryReason,
      supervisorStatus.healthSensor?.retryReason,
      supervisorStatus.controlPipeline,
      supervisorStatus.pipeline,
      supervisorStatus.objective
    ].map(value => String(value || "")).join(" ");
    const retrySuppressionText = [
      runtime?.autoplaySafetyReason,
      runtime?.autoplayAutoplayState?.safetyReason,
      runtime?.autoplayHealthSensor?.retrySuppressedReason,
      runtime?.autoplayAutoplayState?.healthSensor?.retrySuppressedReason,
      supervisorStatus.safetyReason,
      supervisorStatus.healthSensor?.retrySuppressedReason
    ].map(value => String(value || "")).join(" ");
    const openingHealthRetrySuppressed = /opening-health-retry-suppressed/i.test(retrySuppressionText)
      || Boolean(supervisorStatus.healthSensor?.retryControlSuppressed)
      || Boolean(runtime?.autoplayHealthSensor?.retryControlSuppressed);
    const retrySettleActive = !openingHealthRetrySuppressed && (
      /retry|death|health|fatal/i.test(retrySettleText)
        || Boolean(runtime?.autoplayHealthSensor?.retryRequested)
        || Boolean(runtime?.autoplayAutoplayState?.healthSensor?.retryRequested)
        || Boolean(supervisorStatus.retryRequested)
        || Boolean(supervisorStatus.healthRetryRequested)
        || Boolean(supervisorStatus.healthSensor?.retryRequested));
    const openingResetText = [
      runtime?.autoplaySafetyReason,
      runtime?.autoplayAutoplayState?.safetyReason,
      supervisorStatus.safetyReason,
      Array.isArray(runtime?.autoplayActiveDetections) ? runtime.autoplayActiveDetections.join(" ") : "",
      Array.isArray(runtime?.autoplayAutoplayState?.activeDetections) ? runtime.autoplayAutoplayState.activeDetections.join(" ") : "",
      Array.isArray(supervisorStatus.activeDetections) ? supervisorStatus.activeDetections.join(" ") : "",
      runtime?.autoplayStrategyContext,
      supervisorStatus.strategyContext
    ].map(value => String(value || "")).join(" ");
    const postRetryOpeningGuardFrames = Math.max(0, Math.floor(number(
      runtime?.autoplayPostRetryOpeningGuardFrames
        ?? runtime?.autoplayPostRetryHealthGuardFrames
        ?? runtime?.autoplayAutoplayState?.postRetryOpeningGuardFrames
        ?? runtime?.autoplayAutoplayState?.postRetryHealthGuardFrames
        ?? supervisorStatus.postRetryOpeningGuardFrames
        ?? supervisorStatus.postRetryHealthGuardFrames,
      0)));
    const postRetryHealthGuardFrames = Math.max(0, Math.floor(number(
      runtime?.autoplayPostRetryHealthGuardFrames
        ?? runtime?.autoplayAutoplayState?.postRetryHealthGuardFrames
        ?? supervisorStatus.postRetryHealthGuardFrames,
      0)));
    const openingResetProjectionActive = retrySettleActive
      || postRetryOpeningGuardFrames > 0
      || /\b(opening-reset|post-retry-reset|pre-retry-reset|retry-dispatch|retry-sensor-settle)\b/i.test(openingResetText);
    const observedDoorOpenedCount = Math.max(
      canonicalDoorOpenedCount(runtime?.autoplayMilestones),
      canonicalDoorOpenedCount(runtime?.autoplayAutoplayState),
      canonicalDoorOpenedCount(runtime?.autoplayAutoplayState?.milestones),
      canonicalDoorOpenedCount(supervisorStatus),
      canonicalDoorOpenedCount(supervisorStatus.autoplayState),
      canonicalDoorOpenedCount(supervisorStatus.autoplayState?.milestones),
      canonicalDoorOpenedCount(milestones));
    const priorDoorOpenedCount = openingResetProjectionActive ? 0 : observedDoorOpenedCount;
    const doorOpened = !openingResetProjectionActive && priorDoorOpenedCount > 0;
    const firstDoorVision = resolveFirstDoorVisionLock(
      runtime,
      number(frame.firstDoorVision9x9Score, 0),
      number(frame.firstDoorVision9x9RedScore, 0),
      visionBoxTurn(frame.firstDoorVision9x9Box),
      frame.firstDoorVision9x9Box || null,
      doorOpened);
    const doorConfidence = maxScore(
      firstDoor.doorConfidence,
      milestones.firstDoorVision9x9Score,
      firstDoorVision.score,
      frame.firstDoorUse3x3Score,
      frame.firstDoorUseSignature,
      runtime?.autoplayWallUseProbeFrames > 0 ? 0.5 : 0,
      depthSig <= 0.72 && contextDict !== "open-space" ? 0.2 : 0);
    const corridorConfidence = maxScore(
      firstDoor.corridorConfidence,
      frame.firstDoorCorridorSignature,
      frame.spawnCorridorGapScore,
      runtime?.autoplayMotionEntranceScore,
      contextDict === "corridor" ? 0.35 : 0);
    const audioEnemyConfidence = auditoryEnemyConfidence(audio);
    const audioEnemyDirection = auditoryEnemyDirection(audio);
    const doorOpenAudio = doorOpenAudioSemantic(audio, supervisorStatus, runtime);
    const failedDoorOpenAudioGuard = doorOpenAudio.failed
      && !doorOpened
      && priorDoorOpenedCount <= 0;
    const rawVisualEnemyConfidence = maxScore(
      runtime?.autoplayEnemyConfidence,
      frame.enemyConfidence,
      frame.enemyAllRegionPeak,
      Math.abs(faceSig));
    const enemyConfidencePeak = maxScore(
      runtime?.autoplayEnemyConfidencePeak,
      runtime?.autoplayMilestones?.enemyConfidencePeak,
      runtime?.milestones?.enemyConfidencePeak,
      supervisorStatus.enemyConfidencePeak,
      milestones.enemyConfidencePeak,
      frame.enemyConfidencePeak,
      rawVisualEnemyConfidence);
    const terminalSurface = maxScore(
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.computerRoomScore,
      computerRoom.confidence);
    const terminalPanelSurface = maxScore(
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.computerRoomScore);
    const weakTerminalSurfaceEnemy = terminalSurface >= 0.24
      && rawVisualEnemyConfidence <= 0.32
      && audioEnemyConfidence < 0.18;
    const terminalOnlyVisualEnemy = terminalSurface >= 0.24
      && terminalPanelSurface >= 0.24
      && rawVisualEnemyConfidence >= 0.46
      && audioEnemyConfidence < 0.18
      && firstDoorVision.redScore <= 0.08;
    const terminalVisualCombatDecoy = terminalSurface >= 0.24
      && rawVisualEnemyConfidence <= 0.46
      && audioEnemyConfidence < 0.34
      && firstDoorVision.redScore <= 0.08;
    const structuralVisualEnemy = Boolean(frame.enemyStructuralDecoy);
    const darkDamageCombatEvidence = doorOpened
      && damagedHealthPressure
      && !structuralVisualEnemy
      && terminalSurface >= 0.20
      && rawVisualEnemyConfidence >= (lowHealth ? 0.24 : 0.30);
    const visualEnemySuppressed = terminalSurface >= 0.24
      && rawVisualEnemyConfidence <= 0.46
      && !darkDamageCombatEvidence
      && (weakTerminalSurfaceEnemy
        || (audioEnemyConfidence >= 0.24 && audioEnemyDirection !== "front"))
      || (terminalOnlyVisualEnemy && !darkDamageCombatEvidence)
      || (terminalVisualCombatDecoy && !darkDamageCombatEvidence)
      || structuralVisualEnemy;
    const visualEnemyConfidence = visualEnemySuppressed
      ? Math.min(rawVisualEnemyConfidence, 0.10)
      : rawVisualEnemyConfidence;
    const enemyConfidence = maxScore(
      visualEnemyConfidence,
      audioEnemyConfidence);
    const sideAudioBias = audioEnemyConfidence >= 0.24 && (audioEnemyDirection === "left" || audioEnemyDirection === "right");
    const visualEnemyVisible = visualEnemyConfidence >= 0.28
      || (!visualEnemySuppressed && visualEnemyConfidence >= 0.18 && Math.abs(faceSig) >= 0.20);
    const visualEnemyCentered = visualEnemyConfidence >= 0.28 && !sideAudioBias && Math.abs(faceSig) <= 0.12;
    const visualEnemyYaw = visualEnemyCentered
      ? 0
      : (sideAudioBias && Math.abs(faceSig) <= 0.12
        ? (audioEnemyDirection === "right" ? 18 : -18)
        : Math.max(-18, Math.min(18, faceSig * 24)));
    const visualEnemyFireReady = visualEnemyCentered && visualEnemyConfidence >= 0.36;
    const audioEnemyYaw = audioEnemyDirection === "right"
      ? 18
      : (audioEnemyDirection === "left" ? -18 : 0);
    let trustedEnemyThreat = maxScore(
      structuralVisualEnemy ? 0 : (visualEnemyConfidence >= 0.52 ? visualEnemyConfidence : 0),
      audioEnemyConfidence >= 0.34 ? audioEnemyConfidence : 0,
      darkDamageCombatEvidence ? Math.min(0.46, rawVisualEnemyConfidence * 0.82) : 0);
    let trustedCombatEvidence = trustedEnemyThreat >= 0.26
      || (!structuralVisualEnemy && visualEnemyFireReady)
      || (audioEnemyConfidence >= 0.34 && audioEnemyDirection !== "none")
      || darkDamageCombatEvidence;
    const enemyCombatYaw = visualEnemyVisible && !visualEnemyCentered
      ? visualEnemyYaw
      : (audioEnemyConfidence >= 0.24 ? audioEnemyYaw : visualEnemyYaw);
    const bridgeConfidence = maxScore(
      bridge.confidence,
      milestones.bridgeBrownScore,
      frame.bridgeBrownScore,
      frame.bridgeLaneScore,
      frame.bridgeGreenLeft,
      frame.bridgeGreenCenter,
      frame.bridgeGreenRight);
    const liveComputerRoomConfidence = maxScore(
      frame.computerRoomScore,
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.darkAreaScore);
    const computerRoomConfidence = maxScore(
      computerRoom.confidence,
      milestones.computerRoomScore,
      liveComputerRoomConfidence);
    const postDoorVisualCue = liveComputerRoomConfidence >= 0.14
      || number(frame.computerDarkPanelScore, 0) >= 0.24
      || number(frame.computerPanelScore, 0) >= 0.16
      || number(frame.darkAreaScore, 0) >= 0.08;
    const bridgeGreenHazard = maxScore(frame.bridgeGreenLeft, frame.bridgeGreenCenter, frame.bridgeGreenRight);
    const pipelineText = String(runtime?.autoplayControlPipeline ?? supervisorStatus.controlPipeline ?? supervisorStatus.pipeline ?? "");
    const postUseControlWindow = /post-use/i.test(pipelineText);
    const usePulseCooldownWindow = number(
      runtime?.autoplayPipelineState?.kinesis?.usePulseCooldownFrames
        ?? runtime?.autoplayAutoplayState?.pipelineState?.kinesis?.usePulseCooldownFrames
        ?? runtime?.autoplayAutoplayState?.kinesis?.usePulseCooldownFrames
        ?? runtime?.controlRuntime?.usePulseCooldown
        ?? supervisorStatus.pipelineState?.kinesis?.usePulseCooldownFrames
        ?? supervisorStatus.autoplayState?.pipelineState?.kinesis?.usePulseCooldownFrames
        ?? supervisorStatus.autoplayState?.kinesis?.usePulseCooldownFrames
        ?? supervisorStatus.usePulseCooldown,
      0);
    const pendingUseResponseFrames = number(supervisorStatus.pendingUseResponseFrames, 0);
    const doorTransitionArmedFrames = number(supervisorStatus.doorTransitionArmedFrames, 0);
    const useCooldownWindow = number(runtime?.useCooldown ?? runtime?.autoplayUseCooldown ?? supervisorStatus.useCooldown, 0) > 0
      || usePulseCooldownWindow > 0;
    const freshUseWindow = recentUsePulse
      || pendingUseResponseFrames > 0
      || doorTransitionArmedFrames > 0
      || useCooldownWindow
      || postUseControlWindow;
    const firstDoorUseEvidence = freshUseWindow
      || Boolean(supervisorStatus.firstDoorUseAttempted)
      || Boolean(milestones.firstDoorUseAttempted);
    const postDoorAudioCue = !openingResetProjectionActive
      && !doorOpened
      && !failedDoorOpenAudioGuard
      && isNativeDoorSfx(audio)
      && audioEnergy(audio) >= 0.002
      && postDoorVisualCue
      && freshUseWindow;
    let ambiguousDoorSfxGuardFrames = Math.max(0, Math.floor(number(
      runtime?.autoplayAmbiguousDoorSfxGuardFrames
        ?? supervisorStatus.ambiguousDoorSfxGuardFrames,
      0)));
    if (openingResetProjectionActive || doorOpened) {
      ambiguousDoorSfxGuardFrames = 0;
    } else if (failedDoorOpenAudioGuard) {
      ambiguousDoorSfxGuardFrames = Math.max(ambiguousDoorSfxGuardFrames, 96);
    } else if (postDoorAudioCue) {
      ambiguousDoorSfxGuardFrames = Math.max(ambiguousDoorSfxGuardFrames, 72);
    } else if (ambiguousDoorSfxGuardFrames > 0) {
      ambiguousDoorSfxGuardFrames -= 1;
    }
    if (runtime && typeof runtime === "object") {
      runtime.autoplayAmbiguousDoorSfxGuardFrames = ambiguousDoorSfxGuardFrames;
    }
    const ambiguousDoorSfxGuardActive = ambiguousDoorSfxGuardFrames > 0;
    const firstDoorRouteContext = Boolean(
      supervisorStatus.firstDoorCorridorLocated
        || supervisorStatus.firstDoorUseAttempted
        || milestones.firstDoorUseAttempted
        || corridorConfidence >= 0.20
        || doorConfidence >= 0.20);
    const postDoorOpenGeometryEvidence = number(frame.bridgeDoorScore, 0) >= 0.18
      || bridgeGreenHazard >= 0.30
      || number(frame.computerDarkPanelScore, 0) >= 0.34
      || number(frame.computerPanelScore, 0) >= 0.62
      || number(frame.darkAreaScore, 0) >= 0.10;
    const postDoorVisualOpenCue = !openingResetProjectionActive
      && !doorOpened
      && !failedDoorOpenAudioGuard
      && !ambiguousDoorSfxGuardActive
      && freshUseWindow
      && firstDoorRouteContext
      && depthSig >= 0.82
      && number(frame.bridgeDoorScore, 0) <= 0.38
      && number(frame.firstDoorUse3x3Score, 0) <= 0.08
      && firstDoorVision.redScore <= 0.08
      && maxScore(firstDoorVision.score, number(frame.spawnCorridorGapScore, 0), corridorConfidence) >= 0.36
      && postDoorOpenGeometryEvidence;
    const postDoorStrongComputerVisualCue = !openingResetProjectionActive
      && !doorOpened
      && !failedDoorOpenAudioGuard
      && !ambiguousDoorSfxGuardActive
      && freshUseWindow
      && firstDoorUseEvidence
      && firstDoorRouteContext
      && depthSig >= 0.82
      && number(frame.bridgeDoorScore, 0) <= 0.38
      && number(frame.firstDoorUse3x3Score, 0) <= 0.08
      && firstDoorVision.redScore <= 0.08
      && liveComputerRoomConfidence >= 0.18
      && number(frame.computerPanelScore, 0) >= 0.62
      && bridgeGreenHazard >= 0.42;
    const postDoorStrongDarkComputerVisualCue = !openingResetProjectionActive
      && !doorOpened
      && !failedDoorOpenAudioGuard
      && !ambiguousDoorSfxGuardActive
      && freshUseWindow
      && firstDoorRouteContext
      && depthSig >= 0.82
      && number(frame.firstDoorUse3x3Score, 0) <= 0.08
      && number(frame.bridgeDoorScore, 0) >= 0.12
      && number(frame.bridgeDoorScore, 0) <= 0.38
      && maxScore(liveComputerRoomConfidence, number(frame.computerRoomScore, 0)) >= 0.14
      && number(frame.computerDarkPanelScore, 0) >= 0.54;
    const rawPostDoorTerminalSurface = maxScore(
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.computerRoomScore);
    const weakClosedFirstDoorStillVisible = firstDoorVision.score >= 0.30
      && firstDoorVision.redScore <= 0.08
      && number(frame.firstDoorUse3x3Score, 0) <= 0.04
      && number(frame.bridgeDoorScore, 0) <= 0.08
      && rawPostDoorTerminalSurface <= 0.30
      && liveComputerRoomConfidence <= 0.32
      && bridgeConfidence <= 0.34
      && !postDoorOpenGeometryEvidence;
    const closedDoorContradictionObstacle = maxScore(
      frame.motionObstacleScore,
      frame.footObstacleScore,
      supervisorStatus.motionObstacleScore,
      supervisorStatus.footObstacleScore,
      runtime?.autoplayMotionObstacleScore,
      runtime?.autoplayFootObstacleScore);
    const closedDoorContradictionProgress = maxScore(
      frame.motionForwardProgress,
      supervisorStatus.motionForwardProgress,
      runtime?.autoplayMotionForwardProgress);
    const weakStickyDoorOpenContradiction = doorOpened
      && !openingResetProjectionActive
      && priorDoorOpenedCount <= 1
      && weakClosedFirstDoorStillVisible;
    const doorOpenedContradicted = doorOpened
      && !openingResetProjectionActive
      && (weakStickyDoorOpenContradiction
        || (priorDoorOpenedCount <= 1
          && firstDoorVision.score >= 0.30
          && number(frame.firstDoorUse3x3Score, 0) <= 0.04
          && number(frame.bridgeDoorScore, 0) <= 0.08
          && rawPostDoorTerminalSurface < 0.36
          && liveComputerRoomConfidence < 0.44
          && bridgeConfidence < 0.54
          && closedDoorContradictionObstacle >= 0.50
          && closedDoorContradictionProgress < 0.16));
    const effectiveDoorOpened = !failedDoorOpenAudioGuard
      && ((doorOpened && !doorOpenedContradicted)
        || postDoorStrongComputerVisualCue
        || postDoorStrongDarkComputerVisualCue);
    const postDoorTerminalSurface = effectiveDoorOpened
      ? maxScore(frame.computerPanelScore, frame.computerDarkPanelScore, frame.computerRoomScore)
      : 0;
    const postDoorComputerRoomBridgeEntry = liveComputerRoomConfidence >= 0.28
      && bridgeConfidence >= 0.45
      && postDoorTerminalSurface >= 0.28;
    const postDoorComputerRoomTerminalEntry = liveComputerRoomConfidence >= 0.42
      && bridgeConfidence >= 0.30
      && postDoorTerminalSurface >= 0.38;
    const postDoorComputerRoomVisualEntry = effectiveDoorOpened
      && !openingResetProjectionActive
      && priorDoorOpenedCount > 0
      && (postDoorComputerRoomBridgeEntry || postDoorComputerRoomTerminalEntry)
      && number(frame.firstDoorUse3x3Score, 0) <= 0.08
      && number(frame.bridgeDoorScore, 0) <= 0.40;
    const postDoorEnemyMemoryEvidence = effectiveDoorOpened
      && !structuralVisualEnemy
      && !terminalVisualCombatDecoy
      && enemyConfidencePeak >= 0.62
      && rawVisualEnemyConfidence >= 0.08
      && postDoorTerminalSurface >= 0.28;
    if (postDoorEnemyMemoryEvidence) {
      trustedEnemyThreat = maxScore(trustedEnemyThreat, Math.min(0.34, enemyConfidencePeak * 0.42));
      trustedCombatEvidence = true;
    }
    const centralHallConfidence = maxScore(
      semantic.centralHall?.confidence,
      centralHallEntered ? 1 : 0,
      centralHallFrames / 8);
    const finalRoomConfidence = maxScore(
      finalRoom.confidence,
      finalRoomEntered ? 1 : 0,
      finalRoomCandidateFrames / 14,
      exitSwitchUseFrames > 0 ? 0.42 : 0);
    const safeZoneConfidence = maxScore(
      semantic.safeZone?.confidence,
      health >= 18 && enemyConfidence < 0.35 && depthSig > 0.34 && Math.abs(wallVector) <= 0.5 ? 0.85 : 0,
      contextDict === "open-space" && enemyConfidence < 0.25 ? 0.45 : 0);
    const spawnGap = resolveSpawnGapTurn(
      runtime,
      number(frame.spawnCorridorGapScore, 0),
      frame.spawnCorridorGapTurn,
      doorOpened);
    const bridgeDoorScore = number(frame.bridgeDoorScore, 0);
    const spawnDoorPatternFrames = resolveSpawnDoorPatternLock(runtime, bridgeDoorScore, doorOpened);
    const spawnSecretDoor = resolveSpawnSecretDoorTurn(
      runtime,
      number(frame.spawnSecretDoorScore, 0),
      frame.spawnSecretDoorTurn,
      doorOpened);
    const spawnLandmarkRoute = resolveSpawnLandmarkRoute(runtime, frame, spawnGap);
    const stalePostDoorIntentBeforeDoor = !effectiveDoorOpened && !openingResetProjectionActive
      && (isPostFirstDoorIntent(semantic.objective)
        || isPostFirstDoorIntent(supervisorStatus.objective)
        || isPostFirstDoorIntent(runtime?.autoplayObjective)
        || isPostFirstDoorIntent(semantic.phase)
        || isPostFirstDoorIntent(runtime?.autoplayControlPipeline)
        || isPostFirstDoorIntent(supervisorStatus.controlPipeline)
        || isPostFirstDoorIntent(supervisorStatus.pipeline));
    const rawComputerRoomEntered = Boolean(supervisorStatus.computerRoomEntered ?? milestones.computerRoomEntered);
    const postDoorRouteText = [
      runtime?.autoplayObjective,
      runtime?.autoplayControlPipeline,
      supervisorStatus.objective,
      supervisorStatus.controlPipeline,
      supervisorStatus.pipeline,
      supervisorStatus.currentRoute,
      supervisorStatus.route,
      supervisorStatus.routeMode,
      supervisorStatus.autoplayState?.currentRoute,
      supervisorStatus.autoplayState?.route,
      supervisorStatus.autoplayState?.routeMode,
      milestones.currentRoute,
      milestones.route,
      milestones.routeMode,
      frame.currentRoute,
      frame.route,
      frame.routeMode
    ].join(" ").toLowerCase();
    const postDoorComputerRoomVisualEvidence = maxScore(
      liveComputerRoomConfidence,
      postDoorTerminalSurface,
      frame.computerRoomScore,
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.bridgeGreenCenter,
      frame.bridgeGreenLeft,
      frame.bridgeGreenRight);
    const postDoorComputerRoomRouteEntry = effectiveDoorOpened
      && !openingResetProjectionActive
      && (
        liveComputerRoomConfidence >= 0.42
        || (postDoorTerminalSurface >= 0.36 && bridgeConfidence >= 0.34)
        || (postDoorRouteText.indexOf("computer-room") >= 0 && postDoorComputerRoomVisualEvidence >= 0.30)
        || (postDoorRouteText.indexOf("cross-bridge") >= 0 && postDoorComputerRoomVisualEvidence >= 0.38)
      )
      && number(frame.firstDoorUse3x3Score, 0) <= 0.08;
    const postDoorComputerRoomStickyEntry = effectiveDoorOpened
      && !openingResetProjectionActive
      && priorDoorOpenedCount > 0
      && /\b(computer-room|cross-bridge)\b/.test(postDoorRouteText)
      && postDoorComputerRoomVisualEvidence >= 0.30
      && !weakClosedFirstDoorStillVisible;
    const postDoorReturnedOpeningSideEvidence = effectiveDoorOpened
      && rawComputerRoomEntered
      && !centralHallEntered
      && priorDoorOpenedCount <= 1
      && postDoorTerminalSurface <= 0.18
      && liveComputerRoomConfidence <= 0.24
      && (
        safeZoneConfidence >= 0.78
        || contextDict === "open-space"
        || number(frame.courtyardScore, 0) >= 0.22
        || number(frame.spawnSecretDoorScore, 0) >= 0.60)
      && (
        firstDoorVision.score >= 0.28
        || doorConfidence >= 0.68
        || number(frame.spawnSecretDoorScore, 0) >= 0.60
        || number(frame.courtyardScore, 0) >= 0.22);
    const trustedRawComputerRoomEntered = rawComputerRoomEntered && !postDoorReturnedOpeningSideEvidence;
    const computerRoomEntered = effectiveDoorOpened && (
      trustedRawComputerRoomEntered
      || postDoorComputerRoomVisualEntry
      || postDoorComputerRoomRouteEntry
      || postDoorComputerRoomStickyEntry);
    const forceOpeningHomeRoute = openingResetProjectionActive || stalePostDoorIntentBeforeDoor;
    const objectiveRoute = resolveObjectiveRoute({
      semanticObjective: forceOpeningHomeRoute ? "find-and-open-first-door" : (semantic.objective || supervisorStatus.objective),
      currentObjective: forceOpeningHomeRoute ? "find-and-open-first-door" : runtime?.autoplayObjective,
      health,
      doorConfidence,
      corridorConfidence,
      enemyConfidence,
      enemyConfidencePeak,
      trustedEnemyThreat,
      trustedCombatEvidence,
      darkDamageCombatEvidence,
      postDoorEnemyMemoryEvidence,
      terminalVisualCombatDecoy,
      visualEnemyConfidence,
      visualEnemySuppressed,
      enemyStructuralDecoy: structuralVisualEnemy,
      audioEnemyConfidence,
      audioEnemyDirection,
      visualEnemyVisible,
      visualEnemyCentered,
      visualEnemyYaw,
      visualEnemyFireReady,
      enemyCombatYaw,
      audioBalance: audioBalance(audio),
      audioEventType: normalizeAudioEventType(audio.eventType),
      safeZoneConfidence,
      bridgeConfidence,
      computerRoomConfidence,
      firstDoorOpened: effectiveDoorOpened,
      computerRoomEntered,
      postDoorComputerRoomRouteEntry,
      centralHallEntered,
      centralHallFrames,
      stairsEntered,
      enemyDefeatedCount,
      ammoLikelyEmpty,
      finalRoomEntered,
      finalRoomCandidateFrames,
      exitSwitchUseFrames,
      exitSwitchPressed,
      centralHallConfidence,
      finalRoomConfidence,
      spawnCorridorGapScore: spawnGap.score,
      spawnLandmarkRouteEvidence: spawnLandmarkRoute.evidence,
      contextDict
    });
    let projectedObjectiveRoute = objectiveRoute;
    let postDoorRouteProjection = null;
    if (postDoorReturnedOpeningSideEvidence && effectiveDoorOpened && !forceOpeningHomeRoute) {
      projectedObjectiveRoute = Object.assign({}, objectiveRoute || {}, {
        objective: "enter-computer-room",
        purpose: "enter-computer-room",
        means: "reacquire-post-door-entry",
        reason: "post-door-returned-opening-side",
        requestedObjective: "enter-computer-room",
        routingId: "doom-scoped-objective-routing-v1"
      });
      postDoorRouteProjection = {
        currentRoute: "post-door-route",
        route: "post-door-route",
        routeMode: "post-door",
        routeActionHint: "re-enter-computer-room"
      };
    }
    if (effectiveDoorOpened && computerRoomEntered && !forceOpeningHomeRoute) {
      const routeObjective = String(objectiveRoute?.objective || "").toLowerCase();
      const routeReason = String(objectiveRoute?.reason || "").toLowerCase();
      const centralDoorEvidence = centralHallEntered
        || centralHallConfidence >= 0.18
        || bridgeDoorScore >= 0.24
        || routeObjective.indexOf("final-room") >= 0
        || routeObjective.indexOf("level-clear") >= 0;
      const bridgeRouteEvidence = routeObjective.indexOf("reach-central-hall") >= 0
        || routeObjective.indexOf("reach-bridge") >= 0
        || routeReason.indexOf("bridge") >= 0
        || bridgeConfidence >= 0.18
        || postDoorTerminalSurface >= 0.24
        || postDoorRouteText.indexOf("cross-bridge") >= 0;
      const currentRoute = centralDoorEvidence
        ? "central-hall-route"
        : (bridgeRouteEvidence ? "cross-bridge-route" : "computer-room-route");
      postDoorRouteProjection = {
        routeMode: "post-door",
        currentRoute,
        route: currentRoute,
        currentLandmark: centralDoorEvidence
          ? "central-hall-door"
          : (currentRoute === "cross-bridge-route" ? "cross-bridge-lane" : "computer-room-egress"),
        routeActionHint: centralDoorEvidence
          ? "advance-central-hall"
          : (currentRoute === "cross-bridge-route" ? "advance-cross-bridge" : "advance-computer-room")
      };
      projectedObjectiveRoute = Object.assign({}, objectiveRoute, postDoorRouteProjection);
    }
    const objective = projectedObjectiveRoute.objective;
    const motionForwardProgress = Math.max(0, number(state?.movement?.vectorY ?? frame.motionForwardProgress ?? supervisorStatus.motionForwardProgress ?? runtime?.autoplayMotionForwardProgress, 0));
    const motionObstacleScore = number(frame.motionObstacleScore ?? frame.footObstacleScore ?? supervisorStatus.motionObstacleScore ?? runtime?.autoplayMotionObstacleScore, 0);
    const motionTurnScore = Math.abs(number(state?.visualMotion?.vectorX ?? frame.visualMotion?.vectorX ?? frame.motionTurnScore ?? supervisorStatus.motionTurnScore ?? runtime?.autoplayMotionTurnScore, 0));
    const footObstacleScore = number(frame.footObstacleScore ?? supervisorStatus.footObstacleScore, 0);
    const footObstacleFlickerScore = number(frame.footObstacleFlickerScore ?? supervisorStatus.footObstacleFlickerScore, 0);
    const footObstacleBounceFrames = number(frame.footObstacleBounceFrames ?? supervisorStatus.footObstacleBounceFrames, 0);
    const rawSemanticPhase = semantic.phase || runtime?.autoplayControlPipeline || "WasmControl";
    const semanticPhase = effectiveDoorOpened
      ? (computerRoomEntered ? "ComputerRoom" : "PostDoor")
      : (forceOpeningHomeRoute ? "OpeningHome" : rawSemanticPhase);
    const projectedComputerRoomConfidence = (forceOpeningHomeRoute || postDoorReturnedOpeningSideEvidence) ? 0 : computerRoomConfidence;
    const projectedBridgeConfidence = forceOpeningHomeRoute ? 0 : bridgeConfidence;
    const semanticMemory = {
      map: semantic.map || "E1M1",
      symbols: {
        door: doorConfidence,
        corridor: corridorConfidence,
        enemy: enemyConfidence,
        "safe-zone": safeZoneConfidence,
        bridge: projectedBridgeConfidence,
        "computer-room": projectedComputerRoomConfidence,
        "central-hall": centralHallConfidence,
        "final-room": finalRoomConfidence,
        "exit-switch": exitSwitchPressed ? 1 : (exitSwitchUseFrames > 0 ? 0.55 : 0)
      },
      phase: semanticPhase,
      objective,
      route: projectedObjectiveRoute,
      firstDoor: Object.assign({}, firstDoor, {
        corridorConfidence,
        doorConfidence,
        distance: number(firstDoor.distance, depthSig)
      }),
      computerRoom: Object.assign({}, computerRoom, {
        confidence: projectedComputerRoomConfidence
      }),
      bridge: Object.assign({}, bridge, {
        confidence: projectedBridgeConfidence
      }),
      finalRoom: Object.assign({}, finalRoom, {
        confidence: finalRoomConfidence
      }),
      safeZone: {
        confidence: safeZoneConfidence
      },
      lastUpdatedFrame: runtime?.frameCount || 0
    };
    const activeDetections = ["objective", "motion", "door", "wall", "hud"];
    if (audioEnemyConfidence >= 0.24) {
      activeDetections.push(`audio-enemy-${audioEnemyDirection}`);
    }
    if (postDoorEnemyMemoryEvidence) {
      activeDetections.push("post-door-enemy-memory");
    }
    if (terminalVisualCombatDecoy) {
      activeDetections.push("terminal-visual-combat-decoy");
    }
    if (postDoorReturnedOpeningSideEvidence) {
      activeDetections.push("post-door-returned-opening-side");
    }

    return {
      frame: runtime?.frameCount || 0,
      depthSig,
      depthEstimate: depthSig,
      health,
      faceSig,
      contextDict,
      objective,
      objectiveRoute: projectedObjectiveRoute,
      ...(postDoorRouteProjection || {}),
      soundEvent: Boolean(audio.eventDetected),
      retrySettleActive,
      openingResetProjectionActive,
      postRetryOpeningGuardFrames,
      postRetryHealthGuardFrames,
      postDoorAudioCue,
      failedDoorOpenAudioGuard,
      ambiguousDoorSfxGuardFrames,
      postDoorVisualOpenCue,
      postDoorStrongComputerVisualCue,
      postDoorStrongDarkComputerVisualCue,
      doorOpenedContradicted,
      postDoorComputerRoomVisualEntry,
      postDoorComputerRoomRouteEntry,
      postDoorComputerRoomStickyEntry,
      postDoorReturnedOpeningSideEvidence,
      computerRoomEntered,
      centralHallEntered,
      centralHallFrames,
      stairsEntered,
      enemyDefeatedCount,
      ammoLikelyEmpty,
      finalRoomEntered,
      finalRoomCandidateFrames,
      exitSwitchUseFrames,
      exitSwitchPressed,
      centralHallConfidence,
      finalRoomConfidence,
      stuckTicks: Number(runtime?.autoplayStuckFrames || 0),
      qDelta: Math.round(wallVector * 30),
      recoveryFrames: Number(runtime?.autoplayRecoveryFrames || 0),
      actionSignature: runtime?.autoplayActionSignature || supervisorStatus.actionSignature || "",
      actionRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayActionRepeatFrames ?? supervisorStatus.actionRepeatFrames, 0))),
      moveRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayMoveRepeatFrames ?? supervisorStatus.moveRepeatFrames, 0))),
      turnRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayTurnRepeatFrames ?? supervisorStatus.turnRepeatFrames, 0))),
      wallVector,
      doorOpenedCount: effectiveDoorOpened ? Math.max(1, priorDoorOpenedCount) : 0,
      milestones: Object.assign({}, milestones, {
        doorOpened: effectiveDoorOpened ? Math.max(1, priorDoorOpenedCount) : 0,
        doorOpenedCount: effectiveDoorOpened ? Math.max(1, priorDoorOpenedCount) : 0,
        computerRoomEntered
      }),
      doorConfidence,
      corridorConfidence,
      enemyConfidence,
      enemyConfidencePeak,
      trustedEnemyThreat,
      trustedCombatEvidence,
      darkDamageCombatEvidence,
      postDoorEnemyMemoryEvidence,
      terminalVisualCombatDecoy,
      visualEnemyConfidence,
      visualEnemySuppressed,
      enemyStructuralDecoy: structuralVisualEnemy,
      visualEnemyVisible,
      visualEnemyCentered,
      visualEnemyFireReady,
      audioEnemyConfidence,
      audioEnemyDirection,
      audioBalance: audioBalance(audio),
      audioEventType: normalizeAudioEventType(audio.eventType),
      doorOpenAudioSemanticClass: doorOpenAudio.semanticClass,
      doorOpenAudioSemanticLabel: doorOpenAudio.semanticLabel,
      doorOpenAudioEnergy: doorOpenAudio.energy,
      doorOpenAudioFailed: doorOpenAudio.failed,
      doorOpenAudioOpened: doorOpenAudio.opened,
      safeZoneConfidence,
      bridgeConfidence,
      computerRoomConfidence,
      liveComputerRoomConfidence,
      computerRoomScore: number(frame.computerRoomScore, 0),
      computerPanelScore: number(frame.computerPanelScore, 0),
      computerDarkPanelScore: number(frame.computerDarkPanelScore, 0),
      postDoorTerminalSurface,
      motionForwardProgress,
      motionObstacleScore,
      motionTurnScore,
      footObstacleScore,
      footObstacleFlickerScore,
      footObstacleBounceFrames,
      spawnCorridorGapScore: spawnGap.score,
      spawnCorridorGapTurn: spawnGap.turn,
      spawnCorridorGapLocked: spawnGap.locked,
      spawnCorridorGapLockFrames: spawnGap.frames,
      spawnLandmarkRouteEvidence: spawnLandmarkRoute.evidence,
      spawnLandmarkRouteTurn: spawnLandmarkRoute.turn,
      spawnLandmarkRouteKind: spawnLandmarkRoute.kind,
      spawnLandmarkRouteFrames: spawnLandmarkRoute.frames,
      firstDoorUseTurn: frame.firstDoorUse3x3Turn === "left" || frame.firstDoorUse3x3Turn === "right" ? frame.firstDoorUse3x3Turn : "none",
      firstDoorUse3x3Score: number(frame.firstDoorUse3x3Score, 0),
      firstDoorVision9x9Score: firstDoorVision.score,
      firstDoorVision9x9Turn: firstDoorVision.turn,
      firstDoorVision9x9Box: firstDoorVision.box,
      firstDoorVision9x9RedScore: firstDoorVision.redScore,
      firstDoorVision9x9Locked: firstDoorVision.locked,
      firstDoorVision9x9LockFrames: firstDoorVision.frames,
      bridgeDoorScore,
      bridgeLaneTurn: direction(frame.bridgeLaneTurn, "none"),
      spawnDoorPatternFrames,
      spawnSecretDoorScore: spawnSecretDoor.score,
      spawnSecretDoorTurn: spawnSecretDoor.turn,
      spawnSecretDoorLocked: spawnSecretDoor.locked,
      spawnSecretDoorLockFrames: spawnSecretDoor.frames,
      courtyardScore: number(frame.courtyardScore, 0),
      courtyardTurn: direction(frame.courtyardTurn, "none"),
      spawnWestStairScore: number(frame.spawnWestStairScore, 0),
      spawnWestStairTurn: direction(frame.spawnWestStairTurn, "none"),
      spawnCenterAnchorScore: number(frame.spawnCenterAnchorScore, 0),
      spawnCenterAnchorTurn: direction(frame.spawnCenterAnchorTurn, "none"),
      sensorTensor: wasmSensorTensor,
      semanticMemory,
      activeDetections,
      screen6Regions: [left, center, center, center, right, right].map(value => Math.max(0, Math.min(1, Number(value || 0) / 255)))
    };
  }

  self.AIKernelDoomWasmState = Object.freeze({
    buildWasmSensorTensor,
    createState,
    resolveObjective,
    resolveObjectiveRoute
  });
})();
