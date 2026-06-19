(function () {
  "use strict";

  const SENSOR_TENSOR_SIZE = 32;
  const SENSOR_TENSOR_SHAPE = Object.freeze([4, 8]);
  const SENSOR_TENSOR_VERSION = "doom-sensor-tensor-v1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, number(value)));
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
    const health = Number(runtime?.autoplayHealthSensor?.value ?? runtime?.autoplayHealthSensor?.health ?? state?.player?.health ?? 100);
    const faceSig = number(frame.enemyLateralBias, number(runtime?.autoplayEnemyLateralBias, 0));
    const doorOpened = Boolean(milestones.doorOpened > 0 || supervisorStatus.doorOpenedCount > 0);
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
    const enemyConfidence = maxScore(
      runtime?.autoplayEnemyConfidence,
      frame.enemyConfidence,
      frame.enemyAllRegionPeak,
      Math.abs(faceSig),
      audio.eventDetected ? 0.55 : 0);
    const bridgeConfidence = maxScore(
      bridge.confidence,
      milestones.bridgeBrownScore,
      frame.bridgeBrownScore,
      frame.bridgeLaneScore,
      frame.bridgeGreenLeft,
      frame.bridgeGreenCenter,
      frame.bridgeGreenRight);
    const computerRoomConfidence = maxScore(
      computerRoom.confidence,
      milestones.computerRoomScore,
      frame.computerRoomScore,
      frame.computerPanelScore,
      frame.computerDarkPanelScore,
      frame.darkAreaScore);
    const finalRoomConfidence = maxScore(finalRoom.confidence, milestones.finalRoomEntered ? 1 : 0);
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
    const objectiveRoute = resolveObjectiveRoute({
      semanticObjective: semantic.objective || supervisorStatus.objective,
      currentObjective: runtime?.autoplayObjective,
      health,
      doorConfidence,
      corridorConfidence,
      enemyConfidence,
      safeZoneConfidence,
      bridgeConfidence,
      computerRoomConfidence,
      firstDoorOpened: doorOpened,
      finalRoomConfidence,
      spawnCorridorGapScore: spawnGap.score,
      spawnLandmarkRouteEvidence: spawnLandmarkRoute.evidence,
      contextDict
    });
    const objective = objectiveRoute.objective;
    const motionForwardProgress = Math.max(0, number(state?.movement?.vectorY ?? frame.motionForwardProgress ?? supervisorStatus.motionForwardProgress ?? runtime?.autoplayMotionForwardProgress, 0));
    const motionObstacleScore = number(frame.motionObstacleScore ?? frame.footObstacleScore ?? supervisorStatus.motionObstacleScore ?? runtime?.autoplayMotionObstacleScore, 0);
    const motionTurnScore = Math.abs(number(state?.visualMotion?.vectorX ?? frame.visualMotion?.vectorX ?? frame.motionTurnScore ?? supervisorStatus.motionTurnScore ?? runtime?.autoplayMotionTurnScore, 0));
    const footObstacleScore = number(frame.footObstacleScore ?? supervisorStatus.footObstacleScore, 0);
    const footObstacleFlickerScore = number(frame.footObstacleFlickerScore ?? supervisorStatus.footObstacleFlickerScore, 0);
    const footObstacleBounceFrames = number(frame.footObstacleBounceFrames ?? supervisorStatus.footObstacleBounceFrames, 0);
    const semanticMemory = {
      map: semantic.map || "E1M1",
      symbols: {
        door: doorConfidence,
        corridor: corridorConfidence,
        enemy: enemyConfidence,
        "safe-zone": safeZoneConfidence,
        bridge: bridgeConfidence,
        "computer-room": computerRoomConfidence
      },
      phase: semantic.phase || runtime?.autoplayControlPipeline || "WasmControl",
      objective,
      route: objectiveRoute,
      firstDoor: Object.assign({}, firstDoor, {
        corridorConfidence,
        doorConfidence,
        distance: number(firstDoor.distance, depthSig)
      }),
      computerRoom: Object.assign({}, computerRoom, {
        confidence: computerRoomConfidence
      }),
      bridge: Object.assign({}, bridge, {
        confidence: bridgeConfidence
      }),
      finalRoom: Object.assign({}, finalRoom, {
        confidence: finalRoomConfidence
      }),
      safeZone: {
        confidence: safeZoneConfidence
      },
      lastUpdatedFrame: runtime?.frameCount || 0
    };

    return {
      frame: runtime?.frameCount || 0,
      depthSig,
      depthEstimate: depthSig,
      health,
      faceSig,
      contextDict,
      objective,
      objectiveRoute,
      soundEvent: Boolean(audio.eventDetected),
      stuckTicks: Number(runtime?.autoplayStuckFrames || 0),
      qDelta: Math.round(wallVector * 30),
      recoveryFrames: Number(runtime?.autoplayRecoveryFrames || 0),
      actionSignature: runtime?.autoplayActionSignature || supervisorStatus.actionSignature || "",
      actionRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayActionRepeatFrames ?? supervisorStatus.actionRepeatFrames, 0))),
      moveRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayMoveRepeatFrames ?? supervisorStatus.moveRepeatFrames, 0))),
      turnRepeatFrames: Math.max(0, Math.floor(number(runtime?.autoplayTurnRepeatFrames ?? supervisorStatus.turnRepeatFrames, 0))),
      wallVector,
      doorConfidence,
      corridorConfidence,
      enemyConfidence,
      safeZoneConfidence,
      bridgeConfidence,
      computerRoomConfidence,
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
      activeDetections: ["objective", "motion", "door", "wall", "hud"],
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
