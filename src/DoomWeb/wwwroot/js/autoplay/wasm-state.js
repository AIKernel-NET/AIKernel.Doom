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
    const doorConfidence = maxScore(
      firstDoor.doorConfidence,
      milestones.firstDoorVision9x9Score,
      frame.firstDoorVision9x9Score,
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
      firstDoorOpened: Boolean(firstDoor.opened || milestones.firstDoorUseAttempted || milestones.doorOpened > 0),
      finalRoomConfidence,
      contextDict
    });
    const objective = objectiveRoute.objective;
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
      health,
      faceSig,
      contextDict,
      objective,
      objectiveRoute,
      soundEvent: Boolean(audio.eventDetected),
      stuckTicks: Number(runtime?.autoplayStuckFrames || 0),
      qDelta: Math.round(wallVector * 30),
      recoveryFrames: Number(runtime?.autoplayRecoveryFrames || 0),
      wallVector,
      doorConfidence,
      corridorConfidence,
      enemyConfidence,
      safeZoneConfidence,
      bridgeConfidence,
      computerRoomConfidence,
      sensorTensor: wasmSensorTensor,
      semanticMemory,
      activeDetections: ["objective", "motion", "door", "enemy", "wall", "hud"],
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
